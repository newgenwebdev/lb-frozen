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
  } = useAddressForm(editAddress);
  
  const isDefaultAddress = watch("isDefaultShipping") || false;
  
  // React Query mutations
  const addAddressMutation = useAddAddressMutation();
  const updateAddressMutation = useUpdateAddressMutation();

  // Reset form when dialog opens/closes or editAddress changes
  useEffect(() => {
    if (editAddress) {
      reset({
        firstName: editAddress.first_name || "",
        lastName: editAddress.last_name || "",
        city: editAddress.city || "",
        province: editAddress.province || "",
        buildingType: editAddress.company || "",
        buildingNumber: editAddress.address_2 || "",
        phoneNumber: editAddress.phone?.replace(/^\+60\s*/, "") || "",
        postalCode: editAddress.postal_code || "",
        address1: editAddress.address_1 || "",
        isDefaultShipping: editAddress.is_default_shipping || false,
      });
    } else {
      reset({
        firstName: "",
        lastName: "",
        city: "",
        province: "",
        buildingType: "",
        buildingNumber: "",
        phoneNumber: "",
        postalCode: "",
        address1: "",
        isDefaultShipping: false,
      });
    }
  }, [editAddress, open, reset]);

  const onSubmit = async (data: any) => {
    try {
      const addressPayload = {
        first_name: data.firstName,
        last_name: data.lastName,
        address_1: data.address1,
        address_2: data.buildingNumber,
        city: data.city,
        province: data.province,
        postal_code: data.postalCode,
        country_code: "my", // Malaysia
        phone: data.phoneNumber ? `+60${data.phoneNumber.replace(/^0/, "")}` : "",
        company: data.buildingType,
        is_default_shipping: data.isDefaultShipping,
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
            <Label htmlFor="firstName" className="text-xs lg:text-sm font-medium">
              First name
            </Label>
            <Input
              id="firstName"
              placeholder="Ahmad"
              {...register("firstName")}
              className="h-10 lg:h-12 px-3 py-2 text-sm lg:text-base"
            />
            {errors.firstName && (
              <p className="text-xs text-red-500">{errors.firstName.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName" className="text-xs lg:text-sm font-medium">
              Last name
            </Label>
            <Input
              id="lastName"
              placeholder="Fauzi"
              {...register("lastName")}
              className="h-10 lg:h-12 px-3 py-2 text-sm lg:text-base"
            />
            {errors.lastName && (
              <p className="text-xs text-red-500">{errors.lastName.message}</p>
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
            <Label htmlFor="buildingType" className="text-xs lg:text-sm font-medium">
              Building type
            </Label>
            <Controller
              name="buildingType"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
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
            <Label htmlFor="buildingNumber" className="text-xs lg:text-sm font-medium">
              Unit/Building number
            </Label>
            <Input
              id="buildingNumber"
              placeholder="12A"
              {...register("buildingNumber")}
              className="h-10 lg:h-12 px-3 py-2 text-sm lg:text-base"
            />
          </div>
        </div>

        {/* Phone Number and Zip Code */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
          <div className="space-y-2">
            <Label htmlFor="phoneNumber" className="text-xs lg:text-sm font-medium">
              Phone number
            </Label>
            <div className="flex gap-2">
              <div className="flex items-center gap-2 px-2 lg:px-3 border rounded-lg bg-gray-50 h-10 lg:h-12">
                <span className="text-base lg:text-lg">🇲🇾</span>
                <span className="text-xs lg:text-sm font-medium">+60</span>
              </div>
              <Input
                id="phoneNumber"
                placeholder="12-3456 7890"
                {...register("phoneNumber")}
                className="h-10 lg:h-12 px-3 py-2 flex-1 text-sm lg:text-base"
              />
            </div>
            {errors.phoneNumber && (
              <p className="text-xs text-red-500">{errors.phoneNumber.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="postalCode" className="text-xs lg:text-sm font-medium">
              Zip Code
            </Label>
            <Input
              id="postalCode"
              placeholder="50050"
              {...register("postalCode")}
              className="h-10 lg:h-12 px-3 py-2 text-sm lg:text-base"
            />
            {errors.postalCode && (
              <p className="text-xs text-red-500">{errors.postalCode.message}</p>
            )}
          </div>
        </div>

        {/* Full Address */}
        <div className="space-y-2">
          <Label htmlFor="address1" className="text-xs lg:text-sm font-medium">
            Full address
          </Label>
          <Textarea
            id="address1"
            placeholder="No 10, Jalan Bukit, Taman Impian, 50050 Kuala Lumpur, Malaysia"
            {...register("address1")}
            className="min-h-24 lg:min-h-30 resize-none text-sm lg:text-base"
          />
          {errors.address1 && (
            <p className="text-xs text-red-500">{errors.address1.message}</p>
          )}
        </div>

        {/* Set as default address and Confirm Button */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 lg:gap-0 pt-3 lg:pt-4">
          <div className="flex items-center gap-3">
            <Controller
              name="isDefaultShipping"
              control={control}
              render={({ field }) => (
                <Switch
                  id="default-address"
                  checked={field.value}
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
