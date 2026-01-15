"use client";

import { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { useAddressForm } from "@/lib/forms";
import { useAddAddressMutation, useUpdateAddressMutation } from "@/lib/queries";
import { Controller } from "react-hook-form";

interface AddressData {
  id?: string;
  address_name?: string;
  first_name?: string;
  last_name?: string;
  company?: string;
  address_1?: string;
  address_2?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  country_code?: string;
  phone?: string;
  is_default_shipping?: boolean;
}

interface AddAddressDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
  editAddress?: AddressData | null;
  children?: React.ReactNode;
}

export function AddAddressDialog({ 
  open, 
  onOpenChange, 
  onSuccess,
  editAddress,
  children 
}: AddAddressDialogProps) {
  const { showToast } = useToast();
  
  // React Hook Form
  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useAddressForm(editAddress ?? undefined);
  
  const isDefaultAddress = watch("is_default_shipping") || false;
  
  // React Query mutations
  const addAddressMutation = useAddAddressMutation();
  const updateAddressMutation = useUpdateAddressMutation();

  // Reset form when dialog opens/closes or editAddress changes
  useEffect(() => {
    if (editAddress) {
      reset({
        first_name: editAddress.first_name || "",
        last_name: editAddress.last_name || "",
        city: editAddress.city || "",
        province: editAddress.province || "",
        company: editAddress.company || "",
        address_2: editAddress.address_2 || "",
        phone: editAddress.phone?.replace(/^\+60\s*/, "") || "",
        postal_code: editAddress.postal_code || "",
        address_1: editAddress.address_1 || "",
        is_default_shipping: editAddress.is_default_shipping || false,
      });
    } else {
      reset({
        first_name: "",
        last_name: "",
        city: "",
        province: "",
        company: "",
        address_2: "",
        phone: "",
        postal_code: "",
        address_1: "",
        is_default_shipping: false,
      });
    }
  }, [editAddress, open, reset]);

  const onSubmit = async (data: any) => {
    try {
      const addressPayload = {
        first_name: data.first_name,
        last_name: data.last_name,
        address_1: data.address_1,
        address_2: data.address_2,
        city: data.city,
        province: data.province,
        postal_code: data.postal_code,
        country_code: "my", // Malaysia
        phone: data.phone ? `+60${data.phone.replace(/^0/, "")}` : "",
        company: data.company,
        is_default_shipping: data.is_default_shipping,
      };

      if (editAddress?.id) {
        // Update existing address
        await updateAddressMutation.mutateAsync({
          addressId: editAddress.id,
          address: addressPayload,
        });
        showToast("Address updated successfully", "success");
      } else {
        // Add new address
        await addAddressMutation.mutateAsync(addressPayload);
        showToast("Address added successfully", "success");
      }

      onSuccess?.();
      onOpenChange?.(false);
    } catch (error) {
      console.error("Failed to save address:", error);
      showToast("Failed to save address. Please try again.", "error");
    }
  };

  const isControlled = open !== undefined;

  const dialogContent = (
    <DialogContent className="max-w-[95vw] lg:max-w-225 w-full max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="text-xl lg:text-2xl font-bold">
          {editAddress ? "Edit delivery address" : "Add new delivery address"}
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-4 lg:space-y-6 mt-4 lg:mt-6">
        {/* First Name and Last Name */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
          <div className="space-y-2">
            <Label htmlFor="first_name" className="text-xs lg:text-sm font-medium">
              First name
            </Label>
            <Input
              id="first_name"
              placeholder="Ahmad"
              {...register("first_name")}
              className="h-10 lg:h-12 px-3 py-2 text-sm lg:text-base"
            />
            {errors.first_name && (
              <p className="text-xs text-red-500">{errors.first_name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="last_name" className="text-xs lg:text-sm font-medium">
              Last name
            </Label>
            <Input
              id="last_name"
              placeholder="Fauzi"
              {...register("last_name")}
              className="h-10 lg:h-12 px-3 py-2 text-sm lg:text-base"
            />
            {errors.last_name && (
              <p className="text-xs text-red-500">{errors.last_name.message}</p>
            )}
          </div>
        </div>

        {/* City and State */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
          <div className="space-y-2">
            <Label htmlFor="city" className="text-xs lg:text-sm font-medium">
              City
            </Label>
            <Controller
              name="city"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="h-10! lg:h-12! w-full px-3! py-2! text-sm lg:text-base">
                    <SelectValue placeholder="Select city" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Kuala Lumpur">Kuala Lumpur</SelectItem>
                    <SelectItem value="Penang">Penang</SelectItem>
                    <SelectItem value="Johor Bahru">Johor Bahru</SelectItem>
                    <SelectItem value="Ipoh">Ipoh</SelectItem>
                    <SelectItem value="Shah Alam">Shah Alam</SelectItem>
                    <SelectItem value="Petaling Jaya">Petaling Jaya</SelectItem>
                    <SelectItem value="Subang Jaya">Subang Jaya</SelectItem>
                    <SelectItem value="Kota Kinabalu">Kota Kinabalu</SelectItem>
                    <SelectItem value="Kuching">Kuching</SelectItem>
                    <SelectItem value="Melaka">Melaka</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.city && (
              <p className="text-xs text-red-500">{errors.city.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="province" className="text-xs lg:text-sm font-medium">
              State
            </Label>
            <Controller
              name="province"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="h-10! lg:h-12! w-full px-3! py-2! text-sm lg:text-base">
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Kuala Lumpur">Kuala Lumpur</SelectItem>
                    <SelectItem value="Selangor">Selangor</SelectItem>
                    <SelectItem value="Penang">Penang</SelectItem>
                    <SelectItem value="Johor">Johor</SelectItem>
                    <SelectItem value="Perak">Perak</SelectItem>
                    <SelectItem value="Sabah">Sabah</SelectItem>
                    <SelectItem value="Sarawak">Sarawak</SelectItem>
                    <SelectItem value="Melaka">Melaka</SelectItem>
                    <SelectItem value="Negeri Sembilan">Negeri Sembilan</SelectItem>
                    <SelectItem value="Pahang">Pahang</SelectItem>
                    <SelectItem value="Kedah">Kedah</SelectItem>
                    <SelectItem value="Kelantan">Kelantan</SelectItem>
                    <SelectItem value="Terengganu">Terengganu</SelectItem>
                    <SelectItem value="Perlis">Perlis</SelectItem>
                    <SelectItem value="Putrajaya">Putrajaya</SelectItem>
                    <SelectItem value="Labuan">Labuan</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.province && (
              <p className="text-xs text-red-500">{errors.province.message}</p>
            )}
          </div>
        </div>

        {/* Building Type and Building Number */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
          <div className="space-y-2">
            <Label htmlFor="company" className="text-xs lg:text-sm font-medium">
              Building type
            </Label>
            <Controller
              name="company"
              control={control}
              render={({ field }) => (
                <Select value={field.value || ""} onValueChange={field.onChange}>
                  <SelectTrigger className="h-10! lg:h-12! w-full px-3! py-2! text-sm lg:text-base">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Apartment">Apartment</SelectItem>
                    <SelectItem value="House">House</SelectItem>
                    <SelectItem value="Office">Office</SelectItem>
                    <SelectItem value="Condominium">Condominium</SelectItem>
                    <SelectItem value="Townhouse">Townhouse</SelectItem>
                    <SelectItem value="Shop">Shop</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address_2" className="text-xs lg:text-sm font-medium">
              Unit/Building number
            </Label>
            <Input
              id="address_2"
              placeholder="12A"
              {...register("address_2")}
              className="h-10 lg:h-12 px-3 py-2 text-sm lg:text-base"
            />
          </div>
        </div>

        {/* Phone Number and Zip Code */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-xs lg:text-sm font-medium">
              Phone number
            </Label>
            <div className="flex gap-2">
              <div className="flex items-center gap-2 px-2 lg:px-3 border rounded-lg bg-gray-50 h-10 lg:h-12">
                <span className="text-base lg:text-lg">🇲🇾</span>
                <span className="text-xs lg:text-sm font-medium">+60</span>
              </div>
              <Input
                id="phone"
                placeholder="12-3456 7890"
                {...register("phone")}
                className="h-10 lg:h-12 px-3 py-2 flex-1 text-sm lg:text-base"
              />
            </div>
            {errors.phone && (
              <p className="text-xs text-red-500">{errors.phone.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="postal_code" className="text-xs lg:text-sm font-medium">
              Zip Code
            </Label>
            <Input
              id="postal_code"
              placeholder="50050"
              {...register("postal_code")}
              className="h-10 lg:h-12 px-3 py-2 text-sm lg:text-base"
            />
            {errors.postal_code && (
              <p className="text-xs text-red-500">{errors.postal_code.message}</p>
            )}
          </div>
        </div>

        {/* Full Address */}
        <div className="space-y-2">
          <Label htmlFor="address_1" className="text-xs lg:text-sm font-medium">
            Full address
          </Label>
          <Textarea
            id="address_1"
            placeholder="No 10, Jalan Bukit, Taman Impian, 50050 Kuala Lumpur, Malaysia"
            {...register("address_1")}
            className="min-h-24 lg:min-h-30 resize-none text-sm lg:text-base"
          />
          {errors.address_1 && (
            <p className="text-xs text-red-500">{errors.address_1.message}</p>
          )}
        </div>

        {/* Set as default address and Confirm Button */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 lg:gap-0 pt-3 lg:pt-4">
          <div className="flex items-center gap-3">
            <Controller
              name="is_default_shipping"
              control={control}
              render={({ field }) => (
                <Switch
                  id="default-address"
                  checked={field.value ?? false}
                  onCheckedChange={field.onChange}
                />
              )}
            />
            <Label htmlFor="default-address" className="text-sm lg:text-base font-medium cursor-pointer">
              Set as default address
            </Label>
          </div>
          <Button
            className="w-full lg:w-auto px-6 lg:px-8 py-5 lg:py-6 text-sm lg:text-base text-white font-semibold rounded-full disabled:opacity-50"
            style={{
              background: "linear-gradient(to bottom, #23429B, #C52129)",
            }}
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving..." : (editAddress ? "Update address" : "Confirm and save")}
          </Button>
        </div>
      </div>
    </DialogContent>
  );

  // Controlled mode (from parent)
  if (isControlled) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        {dialogContent}
      </Dialog>
    );
  }

  // Uncontrolled mode (with trigger)
  return (
    <Dialog>
      <DialogTrigger asChild>
        {children || (
          <button className="text-blue-600 font-medium hover:text-blue-700 flex items-center gap-1 text-sm lg:text-base">
            <span className="text-xl">+</span> New address
          </button>
        )}
      </DialogTrigger>
      {dialogContent}
    </Dialog>
  );
}
