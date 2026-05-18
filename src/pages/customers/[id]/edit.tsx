import React, { useState, useEffect, useRef } from 'react';
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
  dueAmount: string;
  loyaltyPoints: string;
  notes: string;
}

export default function EditCustomerPage() {
  return (
    <ProtectedRoute requiredRole={['admin', 'manager']}>
      <EditCustomerContent />
    </ProtectedRoute>
  );
}

function EditCustomerContent() {
  const router = useRouter();
  const { id } = router.query;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [existingAvatar, setExistingAvatar] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    gender: '',
    dateOfBirth: '',
    dueAmount: '0',
    loyaltyPoints: '0',
    notes: '',
  });

  useEffect(() => {
    if (!id) return;
    const fetchCustomer = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`/api/customers?id=${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data.success) {
          const c = res.data.data;
          setFormData({
            name: c.name || '',
            email: c.email || '',
            phone: c.phone || '',
            address: c.address || '',
            city: c.city || '',
            gender: c.gender || '',
            dateOfBirth: c.dateOfBirth ? c.dateOfBirth.slice(0, 10) : '',
            dueAmount: c.dueAmount?.toString() || '0',
            loyaltyPoints: c.loyaltyPoints?.toString() || '0',
            notes: c.notes || '',
          });
          if (c.avatar) {
            setExistingAvatar(c.avatar);
            setAvatarPreview(c.avatar);
          }
        }
      } catch {
        toast.error('Failed to load customer');
        router.push('/customers');
      } finally {
        setInitialLoading(false);
      }
    };
    fetchCustomer();
  }, [id, router]);

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

      let avatarUrl = existingAvatar;
      if (avatarFile) {
        avatarUrl = await uploadAvatar();
      }

      const payload: any = { ...formData };
      const unsetFields: Record<string, string> = {};

      if (!payload.email) {
        unsetFields.email = '';
        delete payload.email;
      }
      if (!payload.gender) {
        unsetFields.gender = '';
        delete payload.gender;
      }
      if (!payload.dateOfBirth) {
        unsetFields.dateOfBirth = '';
        delete payload.dateOfBirth;
      }
      if (!payload.avatar && !avatarUrl) {
        // if they removed the avatar
        unsetFields.avatar = '';
        delete payload.avatar;
      } else if (avatarUrl) {
        payload.avatar = avatarUrl;
      }

      delete payload.dueAmount;
      payload.loyaltyPoints = payload.loyaltyPoints === '' ? 0 : Number(payload.loyaltyPoints);

      const finalPayload =
        Object.keys(unsetFields).length > 0 ? { ...payload, $unset: unsetFields } : payload;

      const response = await axios.put(`/api/customers?id=${id}`, finalPayload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        toast.success('Customer updated successfully');
        router.push(`/customers/${id}`);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update customer');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <MainLayout title="Edit Customer">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-600" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Edit Customer">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-secondary-900">Edit Customer</h1>
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
                  Change avatar
                </button>
                <p className="text-xs text-secondary-400 mt-0.5">JPG, PNG, WebP · Max 5MB</p>
                {avatarPreview && (
                  <button
                    type="button"
                    onClick={() => {
                      setAvatarFile(null);
                      setAvatarPreview(null);
                      setExistingAvatar(null);
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

            {/* Financial */}
            <div>
              <h3 className="text-lg font-semibold text-secondary-900 mb-4">Financial</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Loyalty Points"
                  type="number"
                  name="loyaltyPoints"
                  value={formData.loyaltyPoints}
                  onChange={handleChange}
                  placeholder="0"
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
                Update Customer
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
