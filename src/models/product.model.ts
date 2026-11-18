import mongoose, { Schema, type HydratedDocument, type Model } from "mongoose";

export interface IProduct {
    name: string;
    description: string;
    price: number;
    images: string[];
    category: string;
    brand: string;
    sizes: string[];
    colors: string[];
    stock: number;
    material: string;
    gender: string;
    isActive: boolean;
}

export type ProductDocument = HydratedDocument<IProduct>;

const productSchema = new Schema<IProduct>(
    {
        name: {
            type: String,
            required: [true, "Product name is required"],
            trim: true,
        },
        description: {
            type: String,
            required: [true, "Product description is required"],
            trim: true,
        },
        price: {
            type: Number,
            required: [true, "Product price is required"],
            min: [0, "Price cannot be negative"],
        },
        images: {
            type: [String],
            default: [],
        },
        category: {
            type: String,
            required: [true, "Product category is required"],
            trim: true,
        },
        brand: {
            type: String,
            required: [true, "Product brand is required"],
            trim: true,
        },
        sizes: {
            type: [String],
            default: [],
        },
        colors: {
            type: [String],
            default: [],
        },
        stock: {
            type: Number,
            required: [true, "Product stock is required"],
            min: [0, "Stock cannot be negative"],
            default: 0,
        },
        material: {
            type: String,
            required: [true, "Product material is required"],
            trim: true,
        },
        gender: {
            type: String,
            required: [true, "Product gender is required"],
            trim: true,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

export const Product: Model<IProduct> =
    mongoose.models.Product || mongoose.model<IProduct>("Product", productSchema);

export default Product;

