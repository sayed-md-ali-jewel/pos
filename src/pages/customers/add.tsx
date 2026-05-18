import React, { useState, useRef } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';
import Image from 'next/image';
import MainLayout from '@/components/Layout/MainLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Button, Input, Card } from '@/components/Common/FormElements';
import toast from 'react-hot-toast';

interface FormData {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  gender: string;
  dateOfBirth: string;
  notes: string;
}

export default function AddCustomerPage() {
  return (
    <ProtectedRoute requiredRole={['admin', 'manager']}>
      <AddCustomerContent />
    </ProtectedRoute>
  );
}

function AddCustomerContent() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    gender: '',
    dateOfBirth: '',
    notes: '',
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be smaller than 5MB');
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile) return null;
    const token = localStorage.getItem('token');
    const data = new FormData();
    data.append('avatar', avatarFile);
    const res = await axios.post('/api/customers/upload', data, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data.avatarUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');

      let avatarUrl: string | null = null;
      if (avatarFile) {
        avatarUrl = await uploadAvatar();
      }

      const payload: any = { ...formData };
      if (!payload.email) delete payload.email;
      if (!payload.gender) delete payload.gender;
      if (!payload.dateOfBirth) delete payload.dateOfBirth;
      if (avatarUrl) payload.avatar = avatarUrl;

      const response = await axios.post('/api/customers', payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        toast.success('Customer created successfully');
        router.push('/customers');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create customer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout title="Add Customer">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-secondary-900">Add New Customer</h1>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Avatar Upload */}
            <div className="flex items-center gap-6">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="relative h-24 w-24 shrink-0 cursor-pointer overflow-hidden rounded-full bg-gray-100 border-2 border-dashed border-gray-300 hover:border-sky-400 transition"
              >
                {avatarPreview ? (
                  <Image
                    src={avatarPreview}
                    alt="Avatar"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center text-secondary-400">
                    <span className="text-2xl">📷</span>
                    <span className="text-[10px]">Photo</span>
                  </div>
                )}
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-sm font-medium text-sky-600 hover:underline"
                >
                  Upload avatar
                </button>
                <p className="text-xs text-secondary-400 mt-0.5">JPG, PNG, WebP · Max 5MB</p>
                {avatarPreview && (
                  <button
                    type="button"
                    onClick={() => {
                      setAvatarFile(null);
                      setAvatarPreview(null);
                    }}
                    className="text-xs text-red-500 hover:underline mt-1"
                  >
                    Remove
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>

            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-semibold text-secondary-900 mb-4">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Input
                    label="Full Name *"
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Enter customer name"
                    required
                  />
                </div>

                <Input
                  label="Email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="customer@example.com"
                />

                <Input
                  label="Phone Number *"
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Enter phone number"
                  required
                />
              </div>
            </div>

            {/* Personal Details */}
            <div>
              <h3 className="text-lg font-semibold text-secondary-900 mb-4">Personal Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">
                    Gender
                  </label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className="input-field"
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <Input
                  label="Date of Birth"
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Address */}
            <div>
              <h3 className="text-lg font-semibold text-secondary-900 mb-4">Address</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Input
                    label="Street Address"
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Enter street address"
                  />
                </div>

                <Input
                  label="City"
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="Enter city"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">Notes</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Add any notes about the customer..."
                className="input-field"
                rows={3}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-4 pt-4 border-t border-gray-200">
              <Button type="submit" isLoading={loading}>
                Create Customer
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
