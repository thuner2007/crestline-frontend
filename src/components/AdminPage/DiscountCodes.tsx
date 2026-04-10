import { useState, useEffect } from "react";
import {
  PlusCircle,
  Edit,
  Trash2,
  AlertCircle,
  X,
  Tag,
  Percent,
  DollarSign,
  Check,
  Hash,
  Truck,
} from "lucide-react";
import storage from "@/lib/storage";
import { useForm } from "react-hook-form";
import useAxios from "@/useAxios";

interface DiscountCodeProps {
  csrfToken: string;
}

interface DiscountCode {
  id: string;
  code: string;
  type: "percentage" | "fixed" | "free_shipping";
  value: number;
  validFrom?: string;
  validUntil?: string;
  maxUsage?: number;
  usageCount?: number;
  createdAt: string;
  updatedAt: string;
}

interface DiscountCodeForm {
  code: string;
  type: "percentage" | "fixed" | "free_shipping";
  value: number;
  validFrom?: string;
  validUntil?: string;
  maxUsage?: number;
}

const DiscountCodes = ({ csrfToken }: DiscountCodeProps) => {
  const [discountCodes, setDiscountCodes] = useState<DiscountCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<DiscountCode | null>(
    null,
  );
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingDiscount, setDeletingDiscount] = useState<DiscountCode | null>(
    null,
  );
  const axiosInstance = useAxios();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<DiscountCodeForm>({
    defaultValues: {
      code: "",
      type: "percentage",
      value: 10,
      maxUsage: undefined,
    },
  });

  // Fetch all discount codes
  const fetchDiscountCodes = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axiosInstance.get<DiscountCode[]>("/discounts", {
        headers: {
          Authorization: `Bearer ${storage.getItem("access_token")}`,
          "X-CSRF-Token": csrfToken,
        },
      });
      setDiscountCodes(response.data);
    } catch (err: unknown) {
      console.error("Error fetching discount codes:", err);
      // Type guard for axios-like errors
      if (
        err &&
        typeof err === "object" &&
        "response" in err &&
        err.response &&
        typeof err.response === "object" &&
        "status" in err.response
      ) {
        const message =
          err.response &&
          typeof err.response === "object" &&
          "data" in err.response &&
          err.response.data &&
          typeof err.response.data === "object" &&
          "message" in err.response.data
            ? String((err.response.data as { message: unknown }).message)
            : "";
        setError(message || "Failed to load discount codes");
      } else if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        err.code === "NETWORK_ERROR"
      ) {
        setError("Network error. Please check your connection.");
      } else {
        setError("Failed to load discount codes");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiscountCodes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Create or update discount code
  const onSubmit = async (data: DiscountCodeForm) => {
    try {
      // Prepare the request payload
      const payload = {
        code: data.code,
        type: data.type,
        value: Number(data.value), // Ensure value is a number
        validFrom: data.validFrom,
        validUntil: data.validUntil,
        maxUsage: data.maxUsage ? Number(data.maxUsage) : undefined, // Ensure maxUsage is a number or undefined
      };

      // Format dates if they're provided
      if (data.validFrom) {
        // Set time to beginning of day in UTC
        const fromDate = new Date(data.validFrom);
        fromDate.setUTCHours(0, 0, 0, 0);
        payload.validFrom = fromDate.toISOString();
      }

      if (data.validUntil) {
        // Set time to end of day in UTC
        const untilDate = new Date(data.validUntil);
        untilDate.setUTCHours(23, 59, 59, 999);
        payload.validUntil = untilDate.toISOString();
      }

      console.log("Submitting payload:", payload);

      if (editingDiscount) {
        // Update existing discount
        await axiosInstance.put<{ success: boolean }>(
          `/discounts/${editingDiscount.id}`,
          payload,
          {
            headers: {
              Authorization: `Bearer ${storage.getItem("access_token")}`,
              "X-CSRF-Token": csrfToken,
            },
          },
        );
        setSuccess(`Discount code ${data.code} updated successfully!`);
      } else {
        // Create new discount
        await axiosInstance.post<{ success: boolean }>("/discounts", payload, {
          headers: {
            Authorization: `Bearer ${storage.getItem("access_token")}`,
            "X-CSRF-Token": csrfToken,
          },
        });
        setSuccess(`Discount code ${data.code} created successfully!`);
      }

      // Close modal and refresh data
      setIsModalOpen(false);
      setEditingDiscount(null);
      reset();
      fetchDiscountCodes();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      console.error("Error saving discount code:", err);
      // Type guard for axios-like errors
      if (
        err &&
        typeof err === "object" &&
        "response" in err &&
        err.response &&
        typeof err.response === "object" &&
        "status" in err.response
      ) {
        const message =
          err.response &&
          typeof err.response === "object" &&
          "data" in err.response &&
          err.response.data &&
          typeof err.response.data === "object" &&
          "message" in err.response.data
            ? String((err.response.data as { message: unknown }).message)
            : "";
        setError(message || "Failed to save discount code");
      } else if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        err.code === "NETWORK_ERROR"
      ) {
        setError("Network error. Please check your connection.");
      } else {
        setError("Failed to save discount code");
      }
    }
  };

  // Delete discount code
  const deleteDiscountCode = async () => {
    if (!deletingDiscount) return;

    try {
      await axiosInstance.delete<{ success: boolean }>(
        `/discounts/${deletingDiscount.id}`,
        {
          headers: {
            Authorization: `Bearer ${storage.getItem("access_token")}`,
            "X-CSRF-Token": csrfToken,
          },
        },
      );

      setSuccess(`Discount code ${deletingDiscount.code} deleted successfully`);
      setIsDeleteModalOpen(false);
      setDeletingDiscount(null);
      fetchDiscountCodes();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      console.error("Error deleting discount code:", err);
      // Type guard for axios-like errors
      if (
        err &&
        typeof err === "object" &&
        "response" in err &&
        err.response &&
        typeof err.response === "object" &&
        "status" in err.response
      ) {
        const message =
          err.response &&
          typeof err.response === "object" &&
          "data" in err.response &&
          err.response.data &&
          typeof err.response.data === "object" &&
          "message" in err.response.data
            ? String((err.response.data as { message: unknown }).message)
            : "";
        setError(message || "Failed to delete discount code");
      } else if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        err.code === "NETWORK_ERROR"
      ) {
        setError("Network error. Please check your connection.");
      } else {
        setError("Failed to delete discount code");
      }
    }
  };

  // Open edit modal and populate form
  const handleEditDiscount = (discount: DiscountCode) => {
    setEditingDiscount(discount);

    // Format dates for the form
    const formattedValidFrom = discount.validFrom
      ? new Date(discount.validFrom).toISOString().split("T")[0]
      : undefined;

    const formattedValidUntil = discount.validUntil
      ? new Date(discount.validUntil).toISOString().split("T")[0]
      : undefined;

    // Set form values
    setValue("code", discount.code);
    setValue("type", discount.type);
    setValue("value", discount.value);

    if (formattedValidFrom) {
      setValue("validFrom", formattedValidFrom);
    }

    if (formattedValidUntil) {
      setValue("validUntil", formattedValidUntil);
    }

    setValue("maxUsage", discount.maxUsage);

    setIsModalOpen(true);
  };

  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Discount Codes</h2>
        <button
          onClick={() => {
            setEditingDiscount(null);
            reset();
            setIsModalOpen(true);
          }}
          className="px-4 py-2 bg-purple-700 text-white rounded-md hover:bg-purple-800 flex items-center gap-1"
        >
          <PlusCircle className="h-4 w-4" />{" "}
          <span className="hidden sm:inline">Create New Discount</span>
          <span className="sm:hidden">New</span>
        </button>
      </div>

      {/* Success message */}
      {success && (
        <div className="bg-purple-100 border border-purple-400 text-purple-800 p-3 rounded-md">
          {success}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-md flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
        </div>
      ) : (
        <>
          {/* Desktop view */}
          <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Value
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valid From
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valid Until
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Usage / Max
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {discountCodes.length > 0 ? (
                    discountCodes.map((discount) => (
                      <tr key={discount.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Tag className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="font-medium">{discount.code}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {discount.type === "percentage" ? (
                              <span className="text-sm px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                                <Percent className="h-3 w-3 inline mr-1" />
                                Percentage
                              </span>
                            ) : discount.type === "fixed" ? (
                              <span className="text-sm px-2 py-1 rounded-full bg-purple-200 text-purple-900">
                                <DollarSign className="h-3 w-3 inline mr-1" />
                                Fixed
                              </span>
                            ) : (
                              <span className="text-sm px-2 py-1 rounded-full bg-green-100 text-green-800">
                                <Truck className="h-3 w-3 inline mr-1" />
                                Free Shipping
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {discount.type === "percentage"
                            ? `${discount.value}%`
                            : discount.type === "fixed"
                              ? `CHF ${(Number(discount.value) || 0).toFixed(2)}`
                              : "—"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {formatDate(discount.validFrom)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {formatDate(discount.validUntil)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {discount.usageCount || 0} /{" "}
                          {discount.maxUsage || "∞"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEditDiscount(discount)}
                              className="text-blue-600 hover:text-blue-800 p-2 rounded hover:bg-blue-50"
                              title="Edit discount"
                              aria-label={`Edit discount ${discount.code}`}
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                setDeletingDiscount(discount);
                                setIsDeleteModalOpen(true);
                              }}
                              className="text-red-600 hover:text-red-800 p-2 rounded hover:bg-red-50"
                              title="Delete discount"
                              aria-label={`Delete discount ${discount.code}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-6 py-4 text-center text-gray-500"
                      >
                        No discount codes found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile view */}
          <div className="md:hidden space-y-4">
            {discountCodes.length > 0 ? (
              discountCodes.map((discount) => (
                <div
                  key={discount.id}
                  className="bg-white rounded-lg shadow p-4 border border-gray-200"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center">
                      <Tag className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="font-medium text-gray-900">
                        {discount.code}
                      </span>
                    </div>
                    {discount.type === "percentage" ? (
                      <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                        <Percent className="h-3 w-3 inline mr-1" />
                        {discount.value}%
                      </span>
                    ) : discount.type === "fixed" ? (
                      <span className="text-xs px-2 py-1 rounded-full bg-purple-200 text-purple-900">
                        <DollarSign className="h-3 w-3 inline mr-1" />
                        CHF {(Number(discount.value) || 0).toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800">
                        <Truck className="h-3 w-3 inline mr-1" />
                        Free Shipping
                      </span>
                    )}
                  </div>

                  <div className="mt-3 space-y-2">
                    <div className="grid grid-cols-2 text-xs">
                      <span className="text-gray-500">Valid From:</span>
                      <span className="text-gray-700">
                        {formatDate(discount.validFrom)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 text-xs">
                      <span className="text-gray-500">Valid Until:</span>
                      <span className="text-gray-700">
                        {formatDate(discount.validUntil)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 text-xs">
                      <span className="text-gray-500">Usage / Max:</span>
                      <span className="text-gray-700">
                        {discount.usageCount || 0} / {discount.maxUsage || "∞"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-100 flex justify-end space-x-2">
                    <button
                      onClick={() => handleEditDiscount(discount)}
                      className="flex items-center justify-center p-2 rounded-md bg-blue-50 text-blue-700"
                      aria-label={`Edit discount ${discount.code}`}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      <span className="text-xs">Edit</span>
                    </button>
                    <button
                      onClick={() => {
                        setDeletingDiscount(discount);
                        setIsDeleteModalOpen(true);
                      }}
                      className="flex items-center justify-center p-2 rounded-md bg-red-50 text-red-700"
                      aria-label={`Delete discount ${discount.code}`}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      <span className="text-xs">Delete</span>
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 bg-white rounded-lg shadow text-gray-500">
                No discount codes found
              </div>
            )}
          </div>
        </>
      )}

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {editingDiscount
                  ? "Edit Discount Code"
                  : "Create New Discount Code"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label
                  htmlFor="code"
                  className="block text-sm font-medium text-gray-700"
                >
                  Code
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Hash className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    id="code"
                    className="pl-10 block w-full border-gray-300 rounded-md shadow-sm focus:ring-purple-600 focus:border-purple-600"
                    placeholder="SUMMER2023"
                    {...register("code", {
                      required: "Discount code is required",
                    })}
                  />
                </div>
                {errors.code && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.code.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Discount Type
                </label>
                <div className="mt-1 space-y-2">
                  <div className="flex items-center">
                    <input
                      id="type-percentage"
                      type="radio"
                      value="percentage"
                      className="h-4 w-4 border-gray-300 text-purple-700 focus:ring-purple-600"
                      {...register("type")}
                    />
                    <label
                      htmlFor="type-percentage"
                      className="ml-2 block text-sm text-gray-700"
                    >
                      <Percent className="inline h-4 w-4 mr-1" />
                      Percentage (%)
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      id="type-fixed"
                      type="radio"
                      value="fixed"
                      className="h-4 w-4 border-gray-300 text-purple-700 focus:ring-purple-600"
                      {...register("type")}
                    />
                    <label
                      htmlFor="type-fixed"
                      className="ml-2 block text-sm text-gray-700"
                    >
                      <DollarSign className="inline h-4 w-4 mr-1" />
                      Fixed Amount (CHF)
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      id="type-free-shipping"
                      type="radio"
                      value="free_shipping"
                      className="h-4 w-4 border-gray-300 text-purple-700 focus:ring-purple-600"
                      {...register("type")}
                    />
                    <label
                      htmlFor="type-free-shipping"
                      className="ml-2 block text-sm text-gray-700"
                    >
                      <Truck className="inline h-4 w-4 mr-1" />
                      Free Shipping
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <label
                  htmlFor="value"
                  className="block text-sm font-medium text-gray-700"
                >
                  Value
                </label>
                <input
                  type="number"
                  id="value"
                  step="0.01"
                  min="0"
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-purple-600 focus:border-purple-600"
                  {...register("value", {
                    required: "Value is required",
                    min: { value: 0, message: "Value must be positive" },
                  })}
                />
                {errors.value && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.value.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="validFrom"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Valid From (optional)
                  </label>
                  <input
                    type="date"
                    id="validFrom"
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-purple-600 focus:border-purple-600"
                    {...register("validFrom")}
                  />
                </div>
                <div>
                  <label
                    htmlFor="validUntil"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Valid Until (optional)
                  </label>
                  <input
                    type="date"
                    id="validUntil"
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-purple-600 focus:border-purple-600"
                    {...register("validUntil")}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="maxUsage"
                  className="block text-sm font-medium text-gray-700"
                >
                  Max Usage (optional)
                </label>
                <input
                  type="number"
                  id="maxUsage"
                  min="0"
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-purple-600 focus:border-purple-600"
                  placeholder="Leave empty for unlimited use"
                  {...register("maxUsage", {
                    min: { value: 1, message: "Max usage must be at least 1" },
                    validate: (value) =>
                      !value ||
                      Number.isInteger(Number(value)) ||
                      "Must be a whole number",
                  })}
                />
                {errors.maxUsage && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.maxUsage.message}
                  </p>
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-700 text-white rounded-md hover:bg-purple-800 flex items-center gap-1"
                >
                  <Check className="h-4 w-4" />
                  {editingDiscount ? "Save Changes" : "Create Discount"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && deletingDiscount && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Confirm Deletion
              </h3>
              <p className="mt-2 text-gray-600">
                Are you sure you want to delete the discount code{" "}
                <strong>{deletingDiscount.code}</strong>? This action cannot be
                undone.
              </p>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setDeletingDiscount(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={deleteDiscountCode}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center gap-1"
              >
                <Trash2 className="h-4 w-4" />
                Delete Discount
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiscountCodes;
