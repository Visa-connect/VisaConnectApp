import { useCallback, useState } from 'react';
import { useAdminStore, adminActions } from '../stores/adminStore';
import { adminUserService } from '../api/adminUserService';

export const useAdminUsers = () => {
  const { state, dispatch } = useAdminStore();

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [pageSize] = useState(50); // Configurable page size

  const calculateUserCounts = useCallback(
    (users: any[]) => {
      const counts = {
        all: users.length,
        active: users.filter((user) => user.is_active).length,
        verified: users.filter((user) => user.is_verified).length,
        unverified: users.filter((user) => !user.is_verified).length,
      };

      dispatch(adminActions.setUserCounts(counts));
      return counts;
    },
    [dispatch]
  );

  const fetchUsers = useCallback(
    async (page: number = currentPage, searchParams?: any) => {
      try {
        dispatch(adminActions.setLoading(true));
        dispatch(adminActions.clearError());

        const offset = (page - 1) * pageSize;

        // Fetch users with pagination
        const response = await adminUserService.searchUsers({
          limit: pageSize,
          offset,
          sort_by: 'created_at',
          sort_order: 'desc',
          ...searchParams,
        });

        if (response.success && response.data) {
          dispatch(adminActions.setUsers(response.data));
          setTotalUsers(response.total);
          setTotalPages(Math.ceil(response.total / pageSize));
          setCurrentPage(page);
          // Only calculate counts for current page users to avoid confusion
          // For accurate counts, we'd need separate API calls for each status
        } else {
          dispatch(adminActions.setError('Failed to load users'));
        }
      } catch (error) {
        console.error('Error fetching users:', error);
        dispatch(
          adminActions.setError('Failed to load users. Please try again.')
        );
      }
    },
    [dispatch, currentPage, pageSize]
  );

  const updateUser = useCallback(
    async (userId: string, userData: any) => {
      try {
        const response = await adminUserService.updateUser(userId, userData);

        if (response) {
          // Update the user in the store
          const updatedUsers = state.users.map((user) =>
            user.id === userId ? { ...user, ...userData } : user
          );
          dispatch(adminActions.setUsers(updatedUsers));
          // Recalculate counts after user update
          calculateUserCounts(updatedUsers);
        } else {
          dispatch(adminActions.setError('Failed to update user'));
        }
      } catch (error) {
        console.error('Error updating user:', error);
        dispatch(
          adminActions.setError('Failed to update user. Please try again.')
        );
      }
    },
    [dispatch, calculateUserCounts, state.users]
  );

  const deleteUser = useCallback(
    async (userId: string) => {
      try {
        const response = await adminUserService.deleteUser(userId);

        if (response.success) {
          // Remove the user from the store
          const updatedUsers = state.users.filter((user) => user.id !== userId);
          dispatch(adminActions.setUsers(updatedUsers));
          // Recalculate counts after user deletion
          calculateUserCounts(updatedUsers);
        } else {
          dispatch(
            adminActions.setError(response.message || 'Failed to delete user')
          );
        }
      } catch (error) {
        console.error('Error deleting user:', error);
        dispatch(
          adminActions.setError('Failed to delete user. Please try again.')
        );
      }
    },
    [dispatch, calculateUserCounts, state.users]
  );

  const refreshData = useCallback(async () => {
    await fetchUsers(1); // Reset to first page on refresh
  }, [fetchUsers]);

  const goToPage = useCallback(
    async (page: number) => {
      if (page >= 1 && page <= totalPages) {
        await fetchUsers(page);
      }
    },
    [fetchUsers, totalPages]
  );

  const nextPage = useCallback(async () => {
    if (currentPage < totalPages) {
      await fetchUsers(currentPage + 1);
    }
  }, [fetchUsers, currentPage, totalPages]);

  const previousPage = useCallback(async () => {
    if (currentPage > 1) {
      await fetchUsers(currentPage - 1);
    }
  }, [fetchUsers, currentPage]);

  const searchUsers = useCallback(
    async (searchParams: any) => {
      await fetchUsers(1, searchParams); // Reset to first page on search
    },
    [fetchUsers]
  );

  // Note: Components should call refreshData() explicitly when needed
  // This avoids unnecessary fetch loops caused by useCallback dependencies

  return {
    users: state.users,
    userCounts: state.userCounts,
    loading: state.loading,
    error: state.error,
    // Pagination data
    currentPage,
    totalPages,
    totalUsers,
    pageSize,
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1,
    // Actions
    fetchUsers,
    updateUser,
    deleteUser,
    refreshData,
    goToPage,
    nextPage,
    previousPage,
    searchUsers,
  };
};
