import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/core/themes/app_theme.dart';
import 'package:mobile/features/superadmin/domain/entities/acak_lapak.dart';
import 'package:mobile/features/superadmin/presentation/providers/acak_lapak_provider.dart';
import 'package:mobile/features/superadmin/presentation/providers/acak_lapak_state.dart';

/// BODY "Acak Lapak" (bukan halaman penuh -- Scaffold/AppBar dipegang
/// MainLayout). Dipakai petugas dan superadmin.
///
/// Fungsinya: nyiapin pool lokasi (slot lapak) SEBELUM pedagang daftar,
/// per cakupan Se-Surabaya / Kecamatan / Jalan / Ruas. Tiap acak selalu
/// mengganti slot lama yang belum diklaim (gantiPoolLama = true).
/// Cakupan yang bisa dipilih ngikutin wilayah tugas: petugas
/// kecamatan/jalan gak bisa acak di luar wilayahnya.
class AcakLapakScreen extends ConsumerStatefulWidget {
  const AcakLapakScreen({super.key});

  @override
  ConsumerState<AcakLapakScreen> createState() => _AcakLapakScreenState();
}

class _AcakLapakScreenState extends ConsumerState<AcakLapakScreen>
    with AutomaticKeepAliveClientMixin {
  @override
  bool get wantKeepAlive => true;

  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(acakLapakProvider.notifier).load());
  }

  Future<void> _acak() async {
    final notifier = ref.read(acakLapakProvider.notifier);
    final state = ref.read(acakLapakProvider);

    // Tiap acak SELALU mengganti pool lama (sama kayak default di web):
    // slot yang belum diklaim dibuang dulu, jadi minta konfirmasi.
    final yakin = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Acak lapak sekarang?'),
        content: Text(
          'Lokasi di ${state.labelCakupan} akan diacak ulang. Lokasi lama yang belum '
          'diambil pedagang akan dihapus, jadi pedagang hanya mendapat lokasi dari '
          'hasil acak ini. Lokasi yang sudah diambil pedagang tidak akan disentuh.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Batal'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            style: FilledButton.styleFrom(backgroundColor: kBrandColor),
            child: const Text('Ya, Acak'),
          ),
        ],
      ),
    );
    if (yakin != true) return;
    await notifier.submit();
  }

  @override
  Widget build(BuildContext context) {
    super.build(context); // wajib buat AutomaticKeepAliveClientMixin
    final state = ref.watch(acakLapakProvider);
    final notifier = ref.read(acakLapakProvider.notifier);

    if (state.isLoading && state.saya == null) {
      return const Center(child: CircularProgressIndicator());
    }

    if (state.error != null && state.saya == null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(state.error!, textAlign: TextAlign.center),
              const SizedBox(height: 12),
              ElevatedButton(onPressed: notifier.load, child: const Text('Coba Lagi')),
            ],
          ),
        ),
      );
    }

    if (state.scopeBoleh.isEmpty) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(24),
          child: Text(
            'Akunmu belum ditugaskan ke wilayah manapun yang bisa diacak. '
            'Hubungi superadmin.',
            textAlign: TextAlign.center,
          ),
        ),
      );
    }

    final scope = state.scope;
    final perluKecamatan = scope != null && scope != AcakScope.kota;
    final perluJalan = scope == AcakScope.jalan || scope == AcakScope.ruas;
    final perluRuas = scope == AcakScope.ruas;

    return RefreshIndicator(
      onRefresh: notifier.load,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        children: [
          _InfoCard(),
          const SizedBox(height: 16),
          const _Label('Cakupan'),
          Wrap(
            spacing: 8,
            runSpacing: 4,
            children: [
              for (final s in state.scopeBoleh)
                ChoiceChip(
                  label: Text(s.label),
                  selected: scope == s,
                  onSelected: (_) => notifier.setScope(s),
                  selectedColor: kBrandColor.withValues(alpha: 0.14),
                  labelStyle: TextStyle(
                    fontWeight: FontWeight.w600,
                    color: scope == s ? kBrandColor : Colors.black87,
                  ),
                ),
            ],
          ),
          if (perluKecamatan) ...[
            const SizedBox(height: 16),
            _Dropdown<String>(
              label: 'Kecamatan',
              value: state.kecamatanOpsi.any((k) => k.id == state.kecamatanId)
                  ? state.kecamatanId
                  : null,
              enabled: !state.kecamatanTerkunci,
              items: [
                for (final k in state.kecamatanOpsi) DropdownMenuItem(value: k.id!, child: Text(k.nama)),
              ],
              onChanged: notifier.setKecamatan,
            ),
          ],
          if (perluJalan) ...[
            const SizedBox(height: 12),
            _Dropdown<String>(
              label: 'Jalan',
              value: state.jalanOpsi.any((j) => j.id == state.jalanId) ? state.jalanId : null,
              enabled: !state.jalanTerkunci && state.kecamatanId != null,
              helper: state.kecamatanId == null ? 'Pilih kecamatan dulu' : null,
              items: [
                for (final j in state.jalanOpsi) DropdownMenuItem(value: j.id, child: Text(j.nama)),
              ],
              onChanged: notifier.setJalan,
            ),
          ],
          if (perluRuas) ...[
            const SizedBox(height: 12),
            _Dropdown<String>(
              label: 'Ruas',
              value: state.ruasOpsi.any((r) => r.id == state.ruasId) ? state.ruasId : null,
              enabled: state.ruasOpsi.isNotEmpty,
              helper: state.jalanId == null
                  ? 'Pilih jalan dulu'
                  : (state.ruasOpsi.isEmpty ? 'Jalan ini belum dibagi ruas' : null),
              items: [
                for (final r in state.ruasOpsi)
                  DropdownMenuItem(value: r.id, child: Text('${r.nama} (kuota ${r.kuota})')),
              ],
              onChanged: notifier.setRuas,
            ),
          ],
          if (state.submitError != null) ...[
            const SizedBox(height: 8),
            Text(state.submitError!, style: const TextStyle(color: Colors.red)),
          ],
          const SizedBox(height: 16),
          FilledButton.icon(
            onPressed: state.canSubmit ? _acak : null,
            style: FilledButton.styleFrom(
              backgroundColor: kBrandColor,
              padding: const EdgeInsets.symmetric(vertical: 14),
            ),
            icon: state.isSubmitting
                ? const SizedBox(
                    height: 18,
                    width: 18,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                  )
                : const Icon(Icons.shuffle),
            label: Text(state.isSubmitting ? 'Mengacak...' : 'Acak Lapak'),
          ),
          if (state.result != null) ...[
            const SizedBox(height: 16),
            _ResultCard(result: state.result!),
          ],
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------- widgets

class _InfoCard extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: kBrandColor.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
      ),
      child: const Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.info_outline, size: 20, color: kBrandColor),
          SizedBox(width: 10),
          Expanded(
            child: Text(
              'Acak Lapak menyiapkan lokasi lapak sebelum pedagang daftar. '
              'Setiap kali diacak, lokasi lama yang belum diambil pedagang '
              'otomatis diganti hasil acak baru.',
              style: TextStyle(fontSize: 13),
            ),
          ),
        ],
      ),
    );
  }
}

class _Label extends StatelessWidget {
  final String text;

  const _Label(this.text);

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 6),
        child: Text(text, style: const TextStyle(fontWeight: FontWeight.w700)),
      );
}

class _Dropdown<T> extends StatelessWidget {
  final String label;
  final T? value;
  final bool enabled;
  final String? helper;
  final List<DropdownMenuItem<T>> items;
  final ValueChanged<T?> onChanged;

  const _Dropdown({
    required this.label,
    required this.value,
    required this.items,
    required this.onChanged,
    this.enabled = true,
    this.helper,
  });

  @override
  Widget build(BuildContext context) {
    return DropdownButtonFormField<T>(
      // ignore: deprecated_member_use
      value: value,
      isExpanded: true,
      items: items,
      onChanged: enabled ? onChanged : null,
      decoration: InputDecoration(
        labelText: label,
        helperText: helper,
        border: const OutlineInputBorder(),
        filled: !enabled,
        fillColor: enabled ? null : Colors.black.withValues(alpha: 0.04),
      ),
    );
  }
}

class _ResultCard extends StatelessWidget {
  final GenerateSlotResult result;

  const _ResultCard({required this.result});

  @override
  Widget build(BuildContext context) {
    final hijau = Colors.green.shade700;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: hijau.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: hijau.withValues(alpha: 0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.check_circle, color: hijau),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Pool lapak siap: ${result.scopeLabel}',
                  style: TextStyle(fontWeight: FontWeight.w700, color: hijau),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              _Angka(label: 'Slot dibuat', value: result.slotDibuat),
              _Angka(label: 'Slot dihapus', value: result.slotDihapus),
              _Angka(label: 'Total slot', value: result.slotAda),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            '${result.jumlahJalan} jalan'
            '${result.jumlahRuas > 0 ? ' · ${result.jumlahRuas} ruas' : ''}',
            style: const TextStyle(fontSize: 12, color: Colors.black54),
          ),
        ],
      ),
    );
  }
}

class _Angka extends StatelessWidget {
  final String label;
  final int value;

  const _Angka({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('$value', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
          Text(label, style: const TextStyle(fontSize: 12, color: Colors.black54)),
        ],
      ),
    );
  }
}