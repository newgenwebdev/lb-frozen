"use client";

import { useState } from "react";
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

export function AddAddressDialog() {
  const [isDefaultAddress, setIsDefaultAddress] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    city: "",
    state: "",
    buildingType: "",
    buildingNumber: "",
    phoneNumber: "",
    zipCode: "",
    fullAddress: "",
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="text-blue-600 font-medium hover:text-blue-700 flex items-center gap-1 text-sm lg:text-base">
          <span className="text-xl">+</span> New address
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] lg:max-w-225 w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl lg:text-2xl font-bold">
            Add new delivery address
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
                value={formData.firstName}
                onChange={(e) => handleInputChange("firstName", e.target.value)}
                className="h-10 lg:h-12 px-3 py-2 text-sm lg:text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-xs lg:text-sm font-medium">
                Last name
              </Label>
              <Input
                id="lastName"
                placeholder="Fauzi"
                value={formData.lastName}
                onChange={(e) => handleInputChange("lastName", e.target.value)}
                className="h-10 lg:h-12 px-3 py-2 text-sm lg:text-base"
              />
            </div>
          </div>

          {/* City and State */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
            <div className="space-y-2">
              <Label htmlFor="city" className="text-xs lg:text-sm font-medium">
                City
              </Label>
              <Select
                value={formData.city}
                onValueChange={(value) => handleInputChange("city", value)}
              >
                <SelectTrigger className="h-10! lg:h-12! w-full px-3! py-2! text-sm lg:text-base">
                  <SelectValue placeholder="Kuala Lumpur" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kuala-lumpur">Kuala Lumpur</SelectItem>
                  <SelectItem value="penang">Penang</SelectItem>
                  <SelectItem value="johor-bahru">Johor Bahru</SelectItem>
                  <SelectItem value="ipoh">Ipoh</SelectItem>
                  <SelectItem value="shah-alam">Shah Alam</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="state" className="text-xs lg:text-sm font-medium">
                State
              </Label>
              <Select
                value={formData.state}
                onValueChange={(value) => handleInputChange("state", value)}
              >
                <SelectTrigger className="h-10! lg:h-12! w-full px-3! py-2! text-sm lg:text-base">
                  <SelectValue placeholder="Kuala Lumpur" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kuala-lumpur">Kuala Lumpur</SelectItem>
                  <SelectItem value="selangor">Selangor</SelectItem>
                  <SelectItem value="penang">Penang</SelectItem>
                  <SelectItem value="johor">Johor</SelectItem>
                  <SelectItem value="perak">Perak</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Building Type and Building Number */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
            <div className="space-y-2">
              <Label htmlFor="buildingType" className="text-xs lg:text-sm font-medium">
                Building type
              </Label>
              <Select
                value={formData.buildingType}
                onValueChange={(value) =>
                  handleInputChange("buildingType", value)
                }
              >
                <SelectTrigger className="h-10! lg:h-12! w-full px-3! py-2! text-sm lg:text-base">
                  <SelectValue placeholder="Apartment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="apartment">Apartment</SelectItem>
                  <SelectItem value="house">House</SelectItem>
                  <SelectItem value="office">Office</SelectItem>
                  <SelectItem value="condo">Condominium</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="buildingNumber" className="text-xs lg:text-sm font-medium">
                Building number
              </Label>
              <Input
                id="buildingNumber"
                placeholder="12A"
                value={formData.buildingNumber}
                onChange={(e) =>
                  handleInputChange("buildingNumber", e.target.value)
                }
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
                  value={formData.phoneNumber}
                  onChange={(e) =>
                    handleInputChange("phoneNumber", e.target.value)
                  }
                  className="h-10 lg:h-12 px-3 py-2 flex-1 text-sm lg:text-base"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="zipCode" className="text-xs lg:text-sm font-medium">
                Zip Code
              </Label>
              <Input
                id="zipCode"
                placeholder="50050"
                value={formData.zipCode}
                onChange={(e) => handleInputChange("zipCode", e.target.value)}
                className="h-10 lg:h-12 px-3 py-2 text-sm lg:text-base"
              />
            </div>
          </div>

          {/* Full Address */}
          <div className="space-y-2">
            <Label htmlFor="fullAddress" className="text-xs lg:text-sm font-medium">
              Full address
            </Label>
            <Textarea
              id="fullAddress"
              placeholder="No 10, Jalan Bukit, Taman Impian, 50050 Kuala Lumpur, Malaysia"
              value={formData.fullAddress}
              onChange={(e) => handleInputChange("fullAddress", e.target.value)}
              className="min-h-24 lg:min-h-30 resize-none text-sm lg:text-base"
            />
          </div>

          {/* Set as default address and Confirm Button */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 lg:gap-0 pt-3 lg:pt-4">
            <div className="flex items-center gap-3">
              <Switch
                id="default-address"
                checked={isDefaultAddress}
                onCheckedChange={setIsDefaultAddress}
              />
              <Label htmlFor="default-address" className="text-sm lg:text-base font-medium cursor-pointer">
                Set as default address
              </Label>
            </div>
            <Button
              className="w-full lg:w-auto px-6 lg:px-8 py-5 lg:py-6 text-sm lg:text-base text-white font-semibold rounded-full"
              style={{
                background: "linear-gradient(to bottom, #23429B, #C52129)",
              }}
            >
              Confirm and save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
