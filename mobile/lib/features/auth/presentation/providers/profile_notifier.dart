import 'dart:async';
import 'dart:io';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/features/auth/data/datasources/profile_remote_datasource.dart';
import 'package:mobile/features/auth/presentation/providers/auth_provider.dart';
import 'package:mobile/core/network/api_exception.dart';

// Notifier untuk upload foto profil
class ProfileNotifier extends StateNotifier<ProfileUploadState> {
  final Ref ref;

  ProfileNotifier(this.ref) : super(const ProfileUploadState());

  Future<void> uploadProfilePhoto(File file) async {
    state = state.copyWith(isUploading: true, error: null);

    try {
      // Upload foto ke backend dengan timeout 30 detik
      await ProfileRemoteDatasource.uploadProfilePhoto(file).timeout(
        const Duration(seconds: 30),
        onTimeout: () => throw ApiException('Upload timeout'),
      );

      // Refresh data user dari /api/me
      await ref.read(authProvider.notifier).refreshUser();

      // Success - clear error dan set uploading false
      state = state.copyWith(isUploading: false, error: null);
    } on ApiException catch (e) {
      state = state.copyWith(isUploading: false, error: e.message);
    } catch (e) {
      state = state.copyWith(
        isUploading: false,
        error: e is TimeoutException
            ? 'Koneksi lambat, upload dibatalkan'
            : 'Error: $e',
      );
    }
  }

  /// Clear error state manual (dipanggil UI setelah show snackbar)
  void clearError() {
    state = state.copyWith(error: null);
  }
}

class ProfileUploadState {
  final bool isUploading;
  final String? error;

  const ProfileUploadState({this.isUploading = false, this.error});

  ProfileUploadState copyWith({bool? isUploading, String? error}) {
    return ProfileUploadState(
      isUploading: isUploading ?? this.isUploading,
      error: error,
    );
  }
}

final profileNotifier =
    StateNotifierProvider<ProfileNotifier, ProfileUploadState>((ref) {
      return ProfileNotifier(ref);
    });
