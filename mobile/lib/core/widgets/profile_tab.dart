import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:mobile/core/themes/app_theme.dart';
import 'package:mobile/core/network/api_config.dart';
import 'package:mobile/features/auth/domain/entities/user.dart';
import 'package:mobile/features/auth/presentation/providers/auth_provider.dart';
import 'package:mobile/features/auth/presentation/providers/profile_notifier.dart';
import 'package:mobile/features/pedagang/presentation/providers/pedagang_provider.dart';
import 'package:mobile/features/landing/presentation/pages/landing_screen.dart';

/// Tab "Profil" -- menampilkan informasi akun yang sesuai dengan role.
/// Pedagang melihat nama usaha dan jenis dagangan; petugas/admin hanya info akun.
/// Status verifikasi tidak ditampilkan karena tidak digunakan.
class ProfileTab extends ConsumerWidget {
  const ProfileTab({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(userProvider);
    final isPedagang = user?.role == 'pedagang';

    return SafeArea(
      child: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        children: [
          _ProfileHeader(user: user),
          const SizedBox(height: 12),
          _InfoTile(
            icon: Icons.person_outline,
            label: 'Nama Lengkap',
            value: user?.name ?? '-',
          ),
          const SizedBox(height: 10),
          if (user?.phone != null && user!.phone!.isNotEmpty)
            _InfoTile(
              icon: Icons.phone_outlined,
              label: 'No. Telepon',
              value: user.phone!,
            ),
          if (user?.phone != null && user!.phone!.isNotEmpty)
            const SizedBox(height: 10),
          _InfoTile(
            icon: Icons.email_outlined,
            label: 'Email',
            value: user?.email ?? '-',
          ),
          const SizedBox(height: 10),
          _InfoTile(
            icon: Icons.badge_outlined,
            label: 'Role',
            value: _roleLabel(user?.role),
          ),
          if (isPedagang) ...[
            const SizedBox(height: 20),
            _PedagangInfoSection(user: user, ref: ref),
          ],
          const SizedBox(height: 20),
          OutlinedButton.icon(
            onPressed: () => _confirmLogout(context, ref),
            icon: const Icon(Icons.logout, color: Colors.red),
            label: const Text('Keluar'),
            style: OutlinedButton.styleFrom(
              foregroundColor: Colors.red,
              side: const BorderSide(color: Colors.red),
            ),
          ),
        ],
      ),
    );
  }

  String _roleLabel(String? role) {
    switch (role) {
      case 'pedagang':
        return 'Pedagang';
      case 'petugas':
        return 'Petugas';
      case 'superadmin':
        return 'Super Admin';
      default:
        return role ?? '-';
    }
  }

  Future<void> _confirmLogout(BuildContext context, WidgetRef ref) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Keluar akun?'),
        content: const Text('Kamu perlu login lagi buat masuk ke akun ini.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Batal'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Keluar'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    await ref.read(authProvider.notifier).logout();
    if (!context.mounted) return;
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const LandingScreen()),
      (route) => false,
    );
  }
}

class _PedagangInfoSection extends ConsumerWidget {
  final AuthUser? user;
  final WidgetRef ref;

  const _PedagangInfoSection({required this.user, required this.ref});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final pedagangState = ref.watch(pedagangProvider);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Informasi Usaha',
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: Colors.black87,
          ),
        ),
        const SizedBox(height: 12),
        if (pedagangState.pengajuan != null) ...[
          _InfoTile(
            icon: Icons.storefront_outlined,
            label: 'Nama Usaha',
            value: pedagangState.pengajuan!.namaUsaha,
          ),
          const SizedBox(height: 10),
          _InfoTile(
            icon: Icons.category_outlined,
            label: 'Jenis Dagangan',
            value: _jenisDaganganLabel(pedagangState.pengajuan!.jenisDagangan),
          ),
        ] else
          Text(
            'Data usaha belum tersedia',
            style: TextStyle(fontSize: 13, color: Colors.grey[600]),
          ),
      ],
    );
  }

  String _jenisDaganganLabel(String jenis) {
    switch (jenis) {
      case 'makanan_minuman':
        return 'Makanan & Minuman';
      case 'bukan_makanan_minuman':
        return 'Bukan Makanan & Minuman';
      default:
        return jenis;
    }
  }
}

class _ProfileHeader extends ConsumerWidget {
  final AuthUser? user;

  const _ProfileHeader({required this.user});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final initials = _initials(user?.name);
    final avatarUrl = user?.avatarUrl;
    final uploadState = ref.watch(profileNotifier);

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [kBrandColor, kBrandColorLight],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        children: [
          Stack(
            children: [
              CircleAvatar(
                radius: 30,
                backgroundColor: Colors.white,
                backgroundImage: avatarUrl != null && avatarUrl.isNotEmpty
                    ? NetworkImage('${ApiConfig.baseUrl}$avatarUrl')
                    : null,
                child: avatarUrl == null || avatarUrl.isEmpty
                    ? Text(
                        initials,
                        style: const TextStyle(
                          color: kBrandColor,
                          fontWeight: FontWeight.w700,
                          fontSize: 20,
                        ),
                      )
                    : null,
              ),
              Positioned(
                bottom: 0,
                right: 0,
                child: GestureDetector(
                  onTap: uploadState.isUploading
                      ? null
                      : () => _showPhotoMenu(context, ref),
                  child: Container(
                    padding: const EdgeInsets.all(4),
                    decoration: BoxDecoration(
                      color: kBrandColor,
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white, width: 2),
                    ),
                    child: uploadState.isUploading
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              valueColor: AlwaysStoppedAnimation<Color>(
                                Colors.white,
                              ),
                            ),
                          )
                        : const Icon(
                            Icons.camera_alt,
                            color: Colors.white,
                            size: 16,
                          ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  user?.name ?? 'Pengguna',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 4),
                Text(
                  user?.email ?? '-',
                  style: const TextStyle(color: Colors.white70, fontSize: 13),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _showPhotoMenu(BuildContext context, WidgetRef ref) {
    showModalBottomSheet(
      context: context,
      builder: (ctx) => Container(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.camera_alt, color: kBrandColor),
              title: const Text('Ambil Foto'),
              onTap: () {
                Navigator.pop(ctx);
                _pickAndUploadPhoto(context, ref, ImageSource.camera);
              },
            ),
            ListTile(
              leading: const Icon(Icons.image, color: kBrandColor),
              title: const Text('Pilih dari Galeri'),
              onTap: () {
                Navigator.pop(ctx);
                _pickAndUploadPhoto(context, ref, ImageSource.gallery);
              },
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _pickAndUploadPhoto(
    BuildContext context,
    WidgetRef ref,
    ImageSource source,
  ) async {
    try {
      final picker = ImagePicker();
      final pickedFile = await picker.pickImage(source: source);

      if (pickedFile == null) return;

      // Upload foto
      await ref
          .read(profileNotifier.notifier)
          .uploadProfilePhoto(File(pickedFile.path));

      if (!context.mounted) return;

      final uploadState = ref.read(profileNotifier);
      if (uploadState.error != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(uploadState.error ?? 'Gagal upload foto'),
            backgroundColor: Colors.red,
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Foto profil berhasil diperbarui'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
      );
    }
  }

  String _initials(String? name) {
    if (name == null || name.trim().isEmpty) return '?';
    final parts = name.trim().split(RegExp(r'\s+'));
    final first = parts.first.substring(0, 1);
    final last = parts.length > 1 ? parts.last.substring(0, 1) : '';
    return (first + last).toUpperCase();
  }
}

class _InfoTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _InfoTile({
    required this.icon,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.black.withValues(alpha: 0.06)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: kBrandColor, size: 20),
              const SizedBox(width: 12),
              Text(
                label,
                style: const TextStyle(color: Colors.black54, fontSize: 13),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Padding(
            padding: const EdgeInsets.only(left: 32),
            child: Text(
              value,
              style: const TextStyle(
                color: Colors.black87,
                fontSize: 13,
                fontWeight: FontWeight.w500,
              ),
              softWrap: true,
            ),
          ),
        ],
      ),
    );
  }
}
