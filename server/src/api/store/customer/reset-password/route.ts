import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { ICustomerModuleService, IEventBusModuleService } from "@medusajs/framework/types";
import { MedusaError } from "@medusajs/framework/utils";
import crypto from "crypto";

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const customerModuleService: ICustomerModuleService = req.scope.resolve(Modules.CUSTOMER);
  const authModuleService = req.scope.resolve(Modules.AUTH);
  const eventBusService = req.scope.resolve(Modules.EVENT_BUS) as IEventBusModuleService;
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const logger = req.scope.resolve("logger");
  
  const { email, token, password } = req.body as any;

  try {
    if (email) {
      // Request reset: generate token and send email
      const [customer] = await customerModuleService.listCustomers({ 
        email: email 
      }, { take: 1 });
      
      if (!customer) {
        // Return 404 or 200 to prevent enumeration (usually 200 is safer but 404 is requested/implied)
        return res.status(404).json({ message: "Customer not found" });
      }

      const resetToken = crypto.randomBytes(32).toString("hex");
      const resetTokenExpire = Date.now() + 3600000; // 1 hour

      await customerModuleService.updateCustomers(customer.id, {
        metadata: {
          reset_token: resetToken,
          reset_token_expire: resetTokenExpire,
        },
      });

      // Emit event for email sending
      await eventBusService.emit([{
        name: "auth.password_reset",
        data: {
          entity_id: email,
          actor_type: "customer",
          token: resetToken,
        }
      }]);

      return res.json({ message: "Reset email sent" });
    } else if (token && password) {
      // Reset password: verify token and update
      
      // Use Query to find customer by metadata
      const { data: customers } = await query.graph({
        entity: "customer",
        fields: ["id", "email", "metadata"],
        filters: {
          metadata: {
            reset_token: token
          }
        }
      });

      if (customers.length === 0) {
        return res.status(400).json({ message: "Invalid or expired token" });
      }

      const customer = customers[0];
      const now = Date.now();
      const expire = Number(customer.metadata?.reset_token_expire);

      if (!expire || now > expire) {
        return res.status(400).json({ message: "Invalid or expired token" });
      }

      // Hash the password using scrypt (same as Medusa's emailpass provider)
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const scrypt = require("scrypt-kdf");
      const hashConfig = { logN: 15, r: 8, p: 1 };
      const passwordHash = await scrypt.kdf(password, hashConfig);
      const passwordHashBase64 = passwordHash.toString("base64");

      // Check if auth identity exists for this customer
      const authIdentities = await authModuleService.listAuthIdentities({
        app_metadata: {
          customer_id: customer.id,
        },
      }, {
        relations: ["provider_identities"]
      });

      let passwordUpdated = false;

      if (authIdentities.length > 0) {
        // Check if any identity has emailpass provider
        for (const authIdentity of authIdentities) {
          const providerIdentity = authIdentity.provider_identities?.find(
            (pi: any) => pi.provider === "emailpass"
          );

          if (providerIdentity) {
            await authModuleService.updateProviderIdentities([{
              id: providerIdentity.id,
              provider_metadata: {
                password: passwordHashBase64,
              },
            }]);
            logger.info(`[RESET-PASSWORD] Updated password for identity ${authIdentity.id} (customer ${customer.id})`);
            passwordUpdated = true;
            break; 
          }
        }
      }

      if (!passwordUpdated) {
        // Create new auth identity if none existed or none had emailpass
        await authModuleService.createAuthIdentities({
          app_metadata: {
            customer_id: customer.id,
          },
          provider_identities: [
            {
              provider: "emailpass",
              entity_id: customer.email.toLowerCase(),
              provider_metadata: {
                password: passwordHashBase64,
              },
            },
          ],
        });
        logger.info(`[RESET-PASSWORD] Created NEW auth identity with password for customer ${customer.id}`);
      }

      // Clear reset token
      await customerModuleService.updateCustomers(customer.id, {
        metadata: { reset_token: null, reset_token_expire: null },
      });

      return res.json({ message: "Password reset successfully" });
    }

    return res.status(400).json({ message: "Invalid request" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
