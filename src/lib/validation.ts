import { z } from "zod";

export const registerSchema = z.object({
  fullName: z.string().trim().min(2, "Please enter your full name.").max(100),
  email: z.string().trim().toLowerCase().email("Please enter a valid email address.").max(254),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, "Please enter a valid 10-digit mobile number."),
  password: z.string().min(8, "Password must be at least 8 characters.").max(72, "Password is too long."),
  role: z.enum(["CUSTOMER", "RESTAURANT_OWNER", "GROCERY_OWNER", "DELIVERY_PARTNER"]),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Please enter a valid email address."),
  password: z.string().min(1, "Please enter your password.").max(72),
});

export const addressSchema = z.object({
  fullName: z.string().trim().min(2, "Please enter a name.").max(100),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, "Please enter a valid 10-digit mobile number."),
  house: z.string().trim().min(1, "Please enter house/flat details.").max(200),
  street: z.string().trim().min(1, "Please enter street/area.").max(200),
  landmark: z.string().trim().max(200).optional().or(z.literal("")),
  city: z.string().trim().min(1, "Please enter a city.").max(100),
  state: z.string().trim().min(1, "Please enter a state.").max(100),
  pincode: z.string().trim().regex(/^[0-9]{6}$/, "Please enter a valid 6-digit pincode."),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  isDefault: z.boolean().optional(),
});

export const addToCartSchema = z.object({
  foodItemId: z.string().uuid().optional(),
  groceryProductId: z.string().uuid().optional(),
  quantity: z.number().int().min(1).max(50).default(1),
});

export const updateCartItemSchema = z.object({ quantity: z.number().int().min(1).max(50) });

export const checkoutSchema = z.object({
  addressId: z.string().uuid("Please select a delivery address."),
  paymentMethod: z.enum(["COD", "UPI"]),
  couponCode: z.string().trim().max(40).optional().or(z.literal("")),
});
