import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/features/user/domain/entities/managed_user.dart';
import 'user_management_notifier.dart';
import 'user_management_state.dart';

/// Satu state per role, jadi tab Pedagang/Petugas/Superadmin punya
/// search, filter, dan halaman masing-masing.
final userManagementProvider = StateNotifierProvider.family<
    UserManagementNotifier, UserManagementState, UserRole>(
  (ref, role) => UserManagementNotifier(role),
);