"use client";

import { useState, useRef, FormEvent, ChangeEvent } from "react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { useAppDispatch } from "@/lib/hooks";
import { addItem, updateItem, TeaSnackItem, ItemType, TimeSlot } from "@/features/itemsSlice";
import { useRouter } from "next/navigation";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import { FiUpload, FiImage, FiX } from "react-icons/fi";
import toast from "react-hot-toast";
import { v4 as uuidv4 } from "uuid";

interface ItemFormProps {
  initialData?: TeaSnackItem;
  mode: "add" | "edit";
}

interface FormErrors {
  name?: string;
  type?: string;
  description?: string;
  imageUrl?: string;
}

export default function ItemForm({ initialData, mode }: ItemFormProps) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(initialData?.name || "");
  const [type, setType] = useState<ItemType>(initialData?.type || "tea");
  const [description, setDescription] = useState(initialData?.description || "");
  const [imageUrl, setImageUrl] = useState(initialData?.imageUrl || "");
  const [imagePreview, setImagePreview] = useState(initialData?.imageUrl || "");
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const validate = () => {
    const e: FormErrors = {};
    if (!name.trim()) e.name = "Item name is required";
    if (!description.trim()) e.description = "Description is required";
    if (!imageUrl && !imagePreview) e.imageUrl = "Please provide an image URL or upload an image";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5 MB.");
      return;
    }

    // Preview immediately
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    // Upload to Firebase Storage
    setUploading(true);
    try {
      const storageRef = ref(storage, `items/${uuidv4()}-${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setImageUrl(url);
      setImagePreview(url);
      toast.success("Image uploaded!");
    } catch {
      toast.error("Image upload failed. You can paste a URL instead.");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    const finalImageUrl = imageUrl || imagePreview;

    try {
      const data = {
        name: name.trim(),
        type,
        description: description.trim(),
        price: 0,
        imageUrl: finalImageUrl,
        isActive,
        timeSlot: "" as TimeSlot,
      };

      if (mode === "add") {
        await dispatch(addItem(data as Omit<TeaSnackItem, "id" | "createdAt">)).unwrap();

        // Also save as a template for Quick Add
        try {
          const { db } = await import("@/lib/firebase");
          const { collection, addDoc, serverTimestamp } = await import("firebase/firestore");
          await addDoc(collection(db, "quickTemplates"), {
            ...data,
            lastUsed: serverTimestamp(),
          });
        } catch (e) {
          console.error("Failed to save template", e);
        }

        toast.success("Item added successfully!");
      } else if (initialData) {
        await dispatch(updateItem({ id: initialData.id, data })).unwrap();
        toast.success("Item updated successfully!");
      }
      router.push("/admin/edit-items");
    } catch {
      toast.error("Failed to save item. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Input
          label="Item Name"
          id="item-name"
          placeholder="e.g., Masala Chai, Espresso"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
          required
        />
        <Select
          label="Item Type"
          id="item-type"
          value={type}
          onChange={(e) => setType(e.target.value as ItemType)}
        >
          <option value="tea">🍵 Tea</option>
          <option value="coffee">☕ Coffee</option>
          <option value="snack">🍪 Snack</option>
        </Select>
      </div>

      <div>
        <label className="label">Description</label>
        <textarea
          id="item-description"
          placeholder="Describe the item, ingredients, flavour profile…"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className={`input-field resize-none ${errors.description ? "border-red-400" : ""}`}
        />
        {errors.description && (
          <p className="mt-1 text-xs text-red-600 font-medium">{errors.description}</p>
        )}
      </div>



      {/* Image Section - DISABLED UPLOAD (No Firebase Storage) */}
      <div>
        <label className="label">Item Image (URL only)</label>
        {/* 
        <div
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors duration-200
            ${imagePreview ? "border-[#1d4ed8] bg-blue-50" : "border-gray-300 hover:border-[#1d4ed8] hover:bg-gray-50"}
            ${errors.imageUrl ? "border-red-400" : ""}`}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
            id="item-image-upload"
          />
          {imagePreview ? (
            <div className="relative inline-block">
              <img
                src={imagePreview}
                alt="Preview"
                className="h-36 w-36 object-cover rounded-xl mx-auto border border-gray-200 shadow"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setImagePreview("");
                  setImageUrl("");
                }}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
              >
                <FiX size={12} />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-gray-400">
              {uploading ? (
                <div className="w-8 h-8 border-2 border-[#1d4ed8] border-t-transparent rounded-full animate-spin" />
              ) : (
                <FiUpload size={28} />
              )}
              <p className="text-sm font-medium text-gray-600">
                {uploading ? "Uploading…" : "Click to upload image"}
              </p>
              <p className="text-xs">PNG, JPG, WEBP up to 5 MB</p>
            </div>
          )}
        </div>
        */}

        <p className="text-[10px] text-gray-400 mb-2 italic">
          * Image upload is disabled. Please paste a direct image link below.
        </p>

        {/* URL fallback - Active */}
        <div className="mt-2">
          <Input
            id="item-image-url"
            placeholder="Or paste an image URL…"
            value={imageUrl}
            onChange={(e) => {
              setImageUrl(e.target.value);
              setImagePreview(e.target.value);
            }}
            icon={<FiImage size={14} />}
          />
        </div>
      </div>

      {/* Availability toggle */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={isActive}
          onClick={() => setIsActive(!isActive)}
          id="item-availability-toggle"
          className={`relative w-11 h-6 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] focus:ring-offset-2
            ${isActive ? "bg-[#1d4ed8]" : "bg-gray-300"}`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300 ${isActive ? "translate-x-5" : "translate-x-0"
              }`}
          />
        </button>
        <span className="text-sm font-medium text-gray-700">
          {isActive ? "Available for ordering" : "Item deactivated"}
        </span>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button
          type="submit"
          variant="primary"
          loading={saving || uploading}
          id="item-save-btn"
          size="lg"
        >
          {mode === "add" ? "Add Item" : "Save Changes"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.push("/admin/edit-items")}
          size="lg"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
