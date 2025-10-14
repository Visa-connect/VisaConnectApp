import { useCallback } from 'react';
import { useAdminStore, adminActions } from '../stores/adminStore';
import { adminUserService } from '../api/adminUserService';

export const useAdminUsers = () => {
  const { state, dispatch } = useAdminStore();

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

  const fetchUsers = useCallback(async () => {
    try {
      dispatch(adminActions.setLoading(true));
      dispatch(adminActions.clearError());

      // Fetch all users
      const response = await adminUserService.searchUsers({
        limit: 1000, // Get all users for now
        sort_by: 'created_at',
        sort_order: 'desc',
      });
      if (response.success && response.data) {
        dispatch(adminActions.setUsers(response.data));
        calculateUserCounts(response.data);
      } else {
        dispatch(adminActions.setError('Failed to load users'));
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      dispatch(
        adminActions.setError('Failed to load users. Please try again.')
      );
    }
  }, [dispatch, calculateUserCounts]);

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
    await fetchUsers();
  }, [fetchUsers]);

  // Note: Components should call refreshData() explicitly when needed
  // This avoids unnecessary fetch loops caused by useCallback dependencies

  return {
    users: state.users,
    userCounts: state.userCounts,
    loading: state.loading,
    error: state.error,
    fetchUsers,
    updateUser,
    deleteUser,
    refreshData,
  };
};
