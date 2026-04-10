import storage from "@/lib/storage";
import { AlertCircle, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import useAxios from "@/useAxios";

interface User {
  id: number;
  username: string;
  role: string;
  createdAt: string;
}

interface ApiResponse {
  statusCode: number;
  data: User[];
}

interface Props {
  csrfToken: string;
}

const ShowUsers: React.FC<Props> = ({ csrfToken }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);
  const accessToken = storage.getItem("access_token");

  const axiosInstance = useAxios();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        // Wait for CSRF token to be available
        if (!csrfToken) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        const response = await axiosInstance.get<ApiResponse>("/users", {
          headers: {
            "X-CSRF-Token": csrfToken,
            Authorization: `Bearer ${accessToken}`,
          },
          withCredentials: true,
        });

        if (response?.data?.data) {
          setUsers(response.data.data);
        } else {
          throw new Error("Invalid response format");
        }
      } catch (err: unknown) {
        console.error("Error fetching users:", err);

        // Type guard for axios-like errors
        if (
          err &&
          typeof err === "object" &&
          "response" in err &&
          err.response &&
          typeof err.response === "object" &&
          "data" in err.response &&
          err.response.data &&
          typeof err.response.data === "object" &&
          "message" in err.response.data &&
          typeof err.response.data.message === "string"
        ) {
          setError(`Failed to fetch users: ${err.response.data.message}`);
        } else if (
          err &&
          typeof err === "object" &&
          "code" in err &&
          err.code === "NETWORK_ERROR"
        ) {
          setError(
            "Failed to fetch users: Network error. Please check your connection."
          );
        } else if (err instanceof Error) {
          setError(`Failed to fetch users: ${err.message}`);
        } else {
          setError("Failed to fetch users: An unknown error occurred");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [csrfToken]);

  const handleDeleteUser = async (user: User) => {
    setUserToDelete(user);
    setDeleteModalOpen(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;

    setDeleting(true);
    setError("");

    try {
      await axiosInstance.delete(`/users/${userToDelete.id}`, {
        headers: {
          "X-CSRF-Token": csrfToken,
          Authorization: `Bearer ${accessToken}`,
        },
        withCredentials: true,
      });

      // Remove the deleted user from the local state
      setUsers(users.filter((user) => user.id !== userToDelete.id));
      setDeleteModalOpen(false);
      setUserToDelete(null);
    } catch (err: unknown) {
      console.error("Error deleting user:", err);

      // Type guard for axios-like errors
      if (
        err &&
        typeof err === "object" &&
        "response" in err &&
        err.response &&
        typeof err.response === "object" &&
        "data" in err.response &&
        err.response.data &&
        typeof err.response.data === "object" &&
        "message" in err.response.data &&
        typeof err.response.data.message === "string"
      ) {
        setError(`Failed to delete user: ${err.response.data.message}`);
      } else if (err instanceof Error) {
        setError(`Failed to delete user: ${err.message}`);
      } else {
        setError("Failed to delete user: An unknown error occurred");
      }
    } finally {
      setDeleting(false);
    }
  };

  const cancelDelete = () => {
    setDeleteModalOpen(false);
    setUserToDelete(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4 flex items-center gap-3">
        <AlertCircle className="text-red-500" />
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-6">User Management</h2>

      {/* Desktop view - Traditional table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Username
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created At
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user: User) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {user.id}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {user.username}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <span
                    className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
                      user.role === "admin"
                        ? "bg-purple-200 text-purple-900"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <button
                    onClick={() => handleDeleteUser(user)}
                    className="text-red-600 hover:text-red-900 p-1 rounded-md hover:bg-red-50"
                    title={`Delete user ${user.username}`}
                    aria-label={`Delete user ${user.username}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile view - Card-based layout */}
      <div className="md:hidden space-y-4">
        {users.map((user: User) => (
          <div
            key={user.id}
            className="bg-white rounded-lg shadow-sm p-4 border border-gray-200"
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="text-md font-medium text-gray-900 mb-1">
                  {user.username}
                </div>
                <div className="text-xs text-gray-500 mb-2">ID: {user.id}</div>
              </div>
              <span
                className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
                  user.role === "admin"
                    ? "bg-purple-200 text-purple-900"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {user.role}
              </span>
            </div>
            <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-100">
              <div className="text-xs text-gray-500">
                Created: {new Date(user.createdAt).toLocaleDateString()}
              </div>
              <button
                onClick={() => handleDeleteUser(user)}
                className="text-red-600 hover:text-red-900 p-1 rounded-md hover:bg-red-50 flex items-center"
                aria-label={`Delete user ${user.username}`}
              >
                <Trash2 size={16} />
                <span className="ml-1 text-xs">Delete</span>
              </button>
            </div>
          </div>
        ))}
        {users.length === 0 && (
          <div className="text-center py-8 text-gray-500">No users found</div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && userToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold mb-4">Confirm Delete</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete user &quot;{userToDelete.username}
              &quot;?
            </p>
            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={cancelDelete}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteUser}
                disabled={deleting}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:bg-red-300"
              >
                {deleting ? "Deleting..." : "Delete User"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShowUsers;
