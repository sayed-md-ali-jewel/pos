import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';
import Image from 'next/image';
import MainLayout from '@/components/Layout/MainLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Button, Input, Card } from '@/components/Common/FormElements';
import toast from 'react-hot-toast';

interface Category {
  _id: string;
  name: string;
}

interface Subcategory {
  _id: string;
  name: string;
}

interface Brand {
  _id: string;
  name: string;
}

interface FormData {
  name: string;
  category: string;
  subcategory: string;
  brand: string;
  barcode: string;
  sku: string;
  price: string;
  cost: string;
  stock: string;
  minStock: string;
  warranty: string;
  description: string;
}

export default function EditProductPage() {
  return (
    <ProtectedRoute requiredRole={['admin', 'manager']}>
      <EditProductContent />
    </ProtectedRoute>
  );
}

function EditProductContent() {
  const router = useRouter();
  const { id } = router.query;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    category: '',
    subcategory: '',
    brand: '',
    barcode: '',
    sku: '',
    price: '',
    cost: '',
    stock: '',
    minStock: '5',
    warranty: 'None',
    description: '',
  });

  useEffect(() => {
    if (id) {
      fetchInitialData();
    }
  }, [id]);

  const fetchInitialData = async () => {
    try {
      setInitialLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch categories, brands, and product details concurrently
      const [catRes, brandRes, productRes] = await Promise.all([
        axios.get('/api/products/categories', { headers }),
        axios.get('/api/products/brands', { headers }),
        axios.get(`/api/products?id=${id}`, { headers }),
      ]);

      if (catRes.data.success) setCategories(catRes.data.data.categories);
      if (brandRes.data.success) setBrands(brandRes.data.data.brands);

      if (productRes.data.success) {
        const product = productRes.data.data;

        // If product has a category, fetch its subcategories
        if (product.category?._id) {
          const subRes = await axios.get(
            `/api/products/subcategories?categoryId=${product.category._id}`,
            { headers }
          );
          if (subRes.data.success) {
            setSubcategories(subRes.data.data.subcategories);
          }
        }

        setFormData({
          name: product.name || '',
          category: product.category?._id || '',
          subcategory: product.subcategory?._id || '',
          brand: product.brand?._id || '',
          barcode: product.barcode || '',
          sku: product.sku || '',
          price: product.price?.toString() || '',
          cost: product.cost?.toString() || '',
          stock: product.stock?.toString() || '',
          minStock: product.minStock?.toString() || '5',
          warranty: product.warranty || 'None',
          description: product.description || '',
        });
        // Pre-fill images - prefer `images[]` array, fall back to legacy `image`
        const existingImgs: string[] =
          product.images?.length > 0 ? product.images : product.image ? [product.image] : [];
        setExistingImages(existingImgs);
        setImagePreviews(existingImgs);
      }
    } catch (error) {
      toast.error('Failed to load product details');
      router.push('/products');
    } finally {
      setInitialLoading(false);
    }
  };

  // Dynamic Subcategory fetching on Category change
  useEffect(() => {
    // Prevent fetching on initial load when initialLoading is true,
    // because fetchInitialData already handles the initial subcategory fetch.
    if (initialLoading) return;

    const fetchSubcategories = async () => {
      if (!formData.category) {
        setSubcategories([]);
        setFormData((prev) => ({ ...prev, subcategory: '' }));
        return;
      }

      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`/api/products/subcategories?categoryId=${formData.category}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.data.success) {
          setSubcategories(res.data.data.subcategories);
          // Only clear if the currently selected subcategory isn't in the new list
          if (
            !res.data.data.subcategories.find((s: Subcategory) => s._id === formData.subcategory)
          ) {
            setFormData((prev) => ({ ...prev, subcategory: '' }));
          }
        }
      } catch (error) {
        console.error('Failed to load subcategories', error);
      }
    };

    fetchSubcategories();
  }, [formData.category, initialLoading]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const valid = files.filter((f) => {
      if (f.size > 5 * 1024 * 1024) {
        toast.error(`${f.name} exceeds 5MB limit`);
        return false;
      }
      return true;
    });

    // Count: existing kept + new files
    const keptExisting = imagePreviews.filter((p) => existingImages.includes(p)).length;
    const totalAfter = keptExisting + imageFiles.length + valid.length;
    if (totalAfter > 5) {
      toast.error('You can upload a maximum of 5 images');
      return;
    }

    setImageFiles((prev) => [...prev, ...valid]);
    setImagePreviews((prev) => [...prev, ...valid.map((f) => URL.createObjectURL(f))]);
    e.target.value = '';
  };

  const removeImage = (index: number) => {
    const previewToRemove = imagePreviews[index];
    // If it's an existing server image, remove from existingImages too
    setExistingImages((prev) => prev.filter((p) => p !== previewToRemove));
    // If it's a new file (blob URL), remove from imageFiles
    const newFilePreviews = imagePreviews.filter((p) => !existingImages.includes(p));
    const newFileIndex = newFilePreviews.indexOf(previewToRemove);
    if (newFileIndex !== -1) {
      setImageFiles((prev) => prev.filter((_, i) => i !== newFileIndex));
    }
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async (): Promise<string[]> => {
    if (!imageFiles.length) return [];
    const token = localStorage.getItem('token');
    const data = new FormData();
    imageFiles.forEach((f) => data.append('images', f));
    const res = await axios.post('/api/products/upload', data, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data.imageUrls as string[];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');

      // Upload any new images
      const newUrls = await uploadImages();
      // Merge: kept existing + newly uploaded
      const keptExisting = existingImages.filter((p) => imagePreviews.includes(p));
      const allImages = [...keptExisting, ...newUrls];

      const payload: any = { ...formData };
      if (!payload.brand) delete payload.brand;
      if (!payload.subcategory) delete payload.subcategory;
      if (!payload.barcode) delete payload.barcode;
      if (!payload.sku) delete payload.sku;
      payload.images = allImages;
      if (allImages.length > 0) payload.image = allImages[0];

      const response = await axios.put(`/api/products?id=${id}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        toast.success('Product updated successfully');
        router.push('/products');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update product');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <MainLayout title="Edit Product">
        <div className="flex justify-center items-center h-64">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-secondary-600"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Edit Product">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-secondary-900">Edit Product</h1>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Image Upload */}
            <div>
              <h3 className="text-lg font-semibold text-secondary-900 mb-1">Product Images</h3>
              <p className="text-xs text-secondary-400 mb-4">
                Upload up to 5 images · JPG, PNG, WebP · Max 5MB each
              </p>

              {/* Drop Zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center w-full h-32 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 cursor-pointer hover:border-sky-400 hover:bg-sky-50 transition"
              >
                <p className="text-3xl mb-1">📷</p>
                <p className="text-sm font-medium text-secondary-600">Click to add images</p>
                <p className="text-xs text-secondary-400 mt-0.5">
                  {imagePreviews.length}/5 selected
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={handleImageChange}
                className="hidden"
              />

              {/* Previews Grid */}
              {imagePreviews.length > 0 && (
                <div className="mt-4 grid grid-cols-3 sm:grid-cols-5 gap-3">
                  {imagePreviews.map((src, i) => (
                    <div key={i} className="relative group aspect-square">
                      <Image
                        src={src}
                        alt={`Image ${i + 1}`}
                        fill
                        className="object-cover rounded-lg"
                        unoptimized
                      />
                      {i === 0 && (
                        <span className="absolute top-1 left-1 rounded bg-sky-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                          Main
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="absolute top-1 right-1 hidden group-hover:flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white text-xs shadow"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-semibold text-secondary-900 mb-4">Basic Information</h3>
              <div className="space-y-4">
                <Input
                  label="Product Name *"
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter product name"
                  required
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">
                      Category *
                    </label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      className="input-field"
                      required
                    >
                      <option value="">Select Category</option>
                      {categories.map((cat) => (
                        <option key={cat._id} value={cat._id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">
                      Subcategory
                    </label>
                    <select
                      name="subcategory"
                      value={formData.subcategory}
                      onChange={handleChange}
                      className="input-field disabled:opacity-50 disabled:bg-gray-100"
                      disabled={!formData.category || subcategories.length === 0}
                    >
                      <option value="">
                        {!formData.category
                          ? 'Select Category First'
                          : subcategories.length === 0
                            ? 'No Subcategories'
                            : 'Select Subcategory'}
                      </option>
                      {subcategories.map((sub) => (
                        <option key={sub._id} value={sub._id}>
                          {sub.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">
                      Brand
                    </label>
                    <select
                      name="brand"
                      value={formData.brand}
                      onChange={handleChange}
                      className="input-field"
                    >
                      <option value="">Select Brand</option>
                      {brands.map((brand) => (
                        <option key={brand._id} value={brand._id}>
                          {brand.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Product description..."
                    className="input-field"
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* Pricing & Stock */}
            <div>
              <h3 className="text-lg font-semibold text-secondary-900 mb-4">Pricing & Stock</h3>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Price (Selling) *"
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  placeholder="0.00"
                  step="0.01"
                  required
                />

                <Input
                  label="Cost (Purchase)"
                  type="number"
                  name="cost"
                  value={formData.cost}
                  onChange={handleChange}
                  placeholder="0.00"
                  step="0.01"
                />

                <Input
                  label="Stock Quantity *"
                  type="number"
                  name="stock"
                  value={formData.stock}
                  onChange={handleChange}
                  placeholder="0"
                  min="0"
                  required
                />

                <Input
                  label="Minimum Stock Alert"
                  type="number"
                  name="minStock"
                  value={formData.minStock}
                  onChange={handleChange}
                  placeholder="5"
                  min="0"
                />
              </div>
            </div>

            {/* Identification */}
            <div>
              <h3 className="text-lg font-semibold text-secondary-900 mb-4">Identification</h3>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Barcode"
                  type="text"
                  name="barcode"
                  value={formData.barcode}
                  onChange={handleChange}
                  placeholder="Product barcode"
                />

                <Input
                  label="SKU"
                  type="text"
                  name="sku"
                  value={formData.sku}
                  onChange={handleChange}
                  placeholder="Product SKU"
                />
              </div>
            </div>

            {/* Warranty */}
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">Warranty</label>
              <select
                name="warranty"
                value={formData.warranty}
                onChange={handleChange}
                className="input-field"
              >
                <option value="None">None</option>
                <option value="1 Month">1 Month</option>
                <option value="3 Months">3 Months</option>
                <option value="6 Months">6 Months</option>
                <option value="1 Year">1 Year</option>
                <option value="2 Years">2 Years</option>
                <option value="3 Years">3 Years</option>
                <option value="4 Years">4 Years</option>
                <option value="5 Years">5 Years</option>
                <option value="6 Years">6 Years</option>
                <option value="7 Years">7 Years</option>
                <option value="8 Years">8 Years</option>
                <option value="9 Years">9 Years</option>
                <option value="10 Years">10 Years</option>
                <option value="11 Years">11 Years</option>
                <option value="12 Years">12 Years</option>
                <option value="13 Years">13 Years</option>
                <option value="14 Years">14 Years</option>
                <option value="15 Years">15 Years</option>
              </select>
            </div>

            {/* Actions */}
            <div className="flex gap-4 pt-4 border-t border-gray-200">
              <Button type="submit" isLoading={loading}>
                Save Changes
              </Button>
              <Button type="button" variant="secondary" onClick={() => router.back()}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </MainLayout>
  );
}
