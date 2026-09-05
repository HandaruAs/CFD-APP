import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/core/widgets/layouts/main_layout.dart';
import 'package:mobile/features/petugas/domain/entities/status_operasional.dart';
import 'package:mobile/features/petugas/domain/entities/jadwal_mingguan.dart';
import 'package:mobile/features/petugas/presentation/providers/jam_operasional_provider.dart';
import 'package:mobile/features/petugas/presentation/providers/jam_operasional_state.dart';
import 'package:mobile/features/petugas/presentation/providers/jam_operasional_notifier.dart';

const _brandColor = Color(0xFF1C3F7C);

class JamOperasionalScreen extends ConsumerStatefulWidget {
  const JamOperasionalScreen({super.key});

  @override
  ConsumerState<JamOperasionalScreen> createState() => _JamOperasionalScreenState();
}

class _JamOperasionalScreenState extends ConsumerState<JamOperasionalScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(jamOperasionalProvider.notifier).loadAll());
  }

  void _showResultSnackBar(bool success, String successMsg) {
    if (!mounted) return;
    final error = ref.read(jamOperasionalProvider).error;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(success ? successMsg : (error ?? 'Gagal memproses.'))),
    );
  }

  Future<String?> _pickTime(String? initial) async {
    TimeOfDay initialTime = TimeOfDay.now();
    if (initial != null && initial.length >= 5) {
      final parts = initial.split(':');
      initialTime = TimeOfDay(hour: int.parse(parts[0]), minute: int.parse(parts[1]));
    }
    final picked = await showTimePicker(context: context, initialTime: initialTime);
    if (picked == null) return null;
    return '${picked.hour.toString().padLeft(2, '0')}:${picked.minute.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(jamOperasionalProvider);

    return MainLayout(
      title: 'Jam Operasional',
      body: RefreshIndicator(
        onRefresh: () => ref.read(jamOperasionalProvider.notifier).loadAll(),
        child: _buildBody(state),
      ),
    );
  }

  Widget _buildBody(JamOperasionalState state) {
    if (state.isLoading && state.status == null) {
      return const Center(child: CircularProgressIndicator());
    }

    if (state.error != null && state.status == null) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(24),
        children: [
          const SizedBox(height: 80),
          const Icon(Icons.error_outline, color: Colors.red, size: 48),
          const SizedBox(height: 12),
          Text(state.error!, textAlign: TextAlign.center),
          const SizedBox(height: 16),
          Center(
            child: ElevatedButton(
              onPressed: () => ref.read(jamOperasionalProvider.notifier).loadAll(),
              style: ElevatedButton.styleFrom(backgroundColor: _brandColor),
              child: const Text('Coba Lagi', style: TextStyle(color: Colors.white)),
            ),
          ),
        ],
      );
    }

    final status = state.status!;

    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(16),
      children: [
        _sectionTitle('Sesi Hari Ini'),
        _buildSesiSection(state, status.sesi),
        const SizedBox(height: 20),
        _sectionTitle('Pendaftaran'),
        _buildPendaftaranSection(state, status.pendaftaran),
        const SizedBox(height: 20),
        _sectionTitle('Jadwal Mingguan'),
        ...kUrutanHari.map((hari) => _buildJadwalTile(state, hari)),
        const SizedBox(height: 20),
        _sectionTitle('Riwayat Sesi'),
        if (status.riwayat.isEmpty)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 8),
            child: Text('Belum ada riwayat sesi.', style: TextStyle(color: Colors.black54)),
          )
        else
          ...status.riwayat.map(_buildRiwayatTile),
      ],
    );
  }

  Widget _sectionTitle(String text) => Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: Text(text, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
      );

  String _formatJam(String jam) => jam.length >= 5 ? jam.substring(0, 5) : jam;

  Widget _buildSesiSection(JamOperasionalState state, SesiAktif? sesi) {
    final notifier = ref.read(jamOperasionalProvider.notifier);

    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: sesi == null
            ? Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Belum ada sesi CFD hari ini.'),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: state.isSaving
                          ? null
                          : () async {
                              final ok = await notifier.bukaSesiSekarang();
                              _showResultSnackBar(ok, 'Sesi CFD berhasil dibuka.');
                            },
                      icon: const Icon(Icons.play_arrow),
                      label: const Text('Buka Sesi Sekarang'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: _brandColor,
                        foregroundColor: Colors.white,
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  OutlinedButton.icon(
                    onPressed: state.isSaving
                        ? null
                        : () async {
                            final jamMulai = await _pickTime(null);
                            if (jamMulai == null || !mounted) return;
                            final jamSelesai = await _pickTime(null);
                            if (jamSelesai == null || !mounted) return;
                            final ok = await notifier.simpanSesi(jamMulai, jamSelesai);
                            _showResultSnackBar(ok, 'Jam sesi berhasil disimpan.');
                          },
                    icon: const Icon(Icons.schedule),
                    label: const Text('Atur Jam Manual'),
                  ),
                ],
              )
            : Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(
                        sesi.aktif ? Icons.circle : Icons.circle_outlined,
                        size: 12,
                        color: sesi.aktif ? Colors.green : Colors.grey,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        sesi.aktif ? 'Sedang Berlangsung' : sesi.status,
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text('${_formatJam(sesi.jamMulai)} - ${_formatJam(sesi.jamSelesaiRencana)} WIB'),
                  if (sesi.aktif) ...[
                    const SizedBox(height: 12),
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton.icon(
                        onPressed: state.isSaving
                            ? null
                            : () async {
                                final confirm = await showDialog<bool>(
                                  context: context,
                                  builder: (_) => AlertDialog(
                                    title: const Text('Akhiri Sesi?'),
                                    content: const Text(
                                      'Sesi CFD hari ini akan diakhiri lebih awal dan tidak bisa dibuka lagi hari ini.',
                                    ),
                                    actions: [
                                      TextButton(
                                        onPressed: () => Navigator.pop(context, false),
                                        child: const Text('Batal'),
                                      ),
                                      TextButton(
                                        onPressed: () => Navigator.pop(context, true),
                                        child: const Text('Akhiri', style: TextStyle(color: Colors.red)),
                                      ),
                                    ],
                                  ),
                                );
                                if (confirm != true) return;
                                final ok = await notifier.akhiriSesiLebihAwal();
                                _showResultSnackBar(ok, 'Sesi berhasil diakhiri.');
                              },
                        icon: const Icon(Icons.stop_circle_outlined, color: Colors.red),
                        label: const Text('Akhiri Sesi Lebih Awal', style: TextStyle(color: Colors.red)),
                      ),
                    ),
                  ],
                ],
              ),
      ),
    );
  }

  Widget _buildPendaftaranSection(JamOperasionalState state, PendaftaranStatus pendaftaran) {
    final notifier = ref.read(jamOperasionalProvider.notifier);

    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('Pendaftaran Dibuka'),
              value: pendaftaran.isOpen,
              activeColor: _brandColor,
              onChanged: state.isSaving
                  ? null
                  : (value) async {
                      final ok = await notifier.updatePendaftaran(
                        isOpen: value,
                        jamBuka: pendaftaran.jamBuka,
                        jamTutup: pendaftaran.jamTutup,
                        linkPendaftaran: pendaftaran.linkPendaftaran,
                      );
                      _showResultSnackBar(
                        ok,
                        value ? 'Pendaftaran dibuka.' : 'Pendaftaran ditutup.',
                      );
                    },
            ),
            const Divider(),
            _timeRow(
              label: 'Jam Buka Pendaftaran',
              value: pendaftaran.jamBuka,
              enabled: !state.isSaving,
              onTap: () async {
                final jam = await _pickTime(pendaftaran.jamBuka);
                if (jam == null) return;
                final ok = await notifier.updatePendaftaran(
                  isOpen: pendaftaran.isOpen,
                  jamBuka: jam,
                  jamTutup: pendaftaran.jamTutup,
                  linkPendaftaran: pendaftaran.linkPendaftaran,
                );
                _showResultSnackBar(ok, 'Jam buka pendaftaran disimpan.');
              },
            ),
            _timeRow(
              label: 'Jam Tutup Pendaftaran',
              value: pendaftaran.jamTutup,
              enabled: !state.isSaving,
              onTap: () async {
                final jam = await _pickTime(pendaftaran.jamTutup);
                if (jam == null) return;
                final ok = await notifier.updatePendaftaran(
                  isOpen: pendaftaran.isOpen,
                  jamBuka: pendaftaran.jamBuka,
                  jamTutup: jam,
                  linkPendaftaran: pendaftaran.linkPendaftaran,
                );
                _showResultSnackBar(ok, 'Jam tutup pendaftaran disimpan.');
              },
            ),
            const SizedBox(height: 4),
            const Text(
              'Catatan: kalau hari ini Jumat, pengaturan ini cuma bisa '
              'diubah sekali.',
              style: TextStyle(color: Colors.black45, fontSize: 12),
            ),
          ],
        ),
      ),
    );
  }

  Widget _timeRow({
    required String label,
    required String? value,
    required bool enabled,
    required VoidCallback onTap,
  }) {
    return ListTile(
      contentPadding: EdgeInsets.zero,
      title: Text(label),
      trailing: Text(
        value == null ? '-' : _formatJam(value),
        style: const TextStyle(fontWeight: FontWeight.bold),
      ),
      onTap: enabled ? onTap : null,
    );
  }

  Widget _buildJadwalTile(JamOperasionalState state, String hari) {
    final jadwal = state.jadwalMingguan.where((j) => j.hari == hari).firstOrNull;
    final notifier = ref.read(jamOperasionalProvider.notifier);

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      child: ListTile(
        title: Text(kLabelHari[hari] ?? hari),
        subtitle: jadwal == null
            ? const Text('Belum diatur')
            : Text(
                '${_formatJam(jadwal.jamMulai)} - ${_formatJam(jadwal.jamSelesaiRencana)}'
                '${jadwal.isActive ? '' : ' (nonaktif)'}',
              ),
        trailing: const Icon(Icons.edit_outlined, size: 20),
        onTap: state.isSaving
            ? null
            : () => _openEditJadwalDialog(hari, jadwal, notifier),
      ),
    );
  }

  Future<void> _openEditJadwalDialog(
    String hari,
    JadwalMingguan? jadwal,
    JamOperasionalNotifier notifier,
  ) async {
    String? jamMulai = jadwal?.jamMulai;
    String? jamSelesai = jadwal?.jamSelesaiRencana;
    bool isActive = jadwal?.isActive ?? true;

    await showDialog(
      context: context,
      builder: (dialogContext) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              title: Text('Jadwal ${kLabelHari[hari]}'),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('Jam Mulai'),
                    trailing: Text(jamMulai == null ? '-' : _formatJam(jamMulai!)),
                    onTap: () async {
                      final jam = await _pickTime(jamMulai);
                      if (jam != null) setDialogState(() => jamMulai = jam);
                    },
                  ),
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('Jam Selesai'),
                    trailing: Text(jamSelesai == null ? '-' : _formatJam(jamSelesai!)),
                    onTap: () async {
                      final jam = await _pickTime(jamSelesai);
                      if (jam != null) setDialogState(() => jamSelesai = jam);
                    },
                  ),
                  SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('Aktif'),
                    value: isActive,
                    onChanged: (v) => setDialogState(() => isActive = v),
                  ),
                ],
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(dialogContext),
                  child: const Text('Batal'),
                ),
                ElevatedButton(
                  onPressed: (jamMulai == null || jamSelesai == null)
                      ? null
                      : () async {
                          Navigator.pop(dialogContext);
                          final ok = await notifier.updateJadwalHari(
                            hari: hari,
                            jamMulai: jamMulai!,
                            jamSelesaiRencana: jamSelesai!,
                            isActive: isActive,
                          );
                          _showResultSnackBar(ok, 'Jadwal ${kLabelHari[hari]} disimpan.');
                        },
                  style: ElevatedButton.styleFrom(backgroundColor: _brandColor),
                  child: const Text('Simpan', style: TextStyle(color: Colors.white)),
                ),
              ],
            );
          },
        );
      },
    );
  }

  Widget _buildRiwayatTile(RiwayatSesi r) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      child: ListTile(
        title: Text(r.tanggal),
        subtitle: Text('${_formatJam(r.jamMulai)} - ${_formatJam(r.jamSelesai)} • ${r.durasi}'),
        trailing: Text(
          r.status == 'diakhiri-awal' ? 'Diakhiri Awal' : 'Normal',
          style: TextStyle(
            fontSize: 12,
            color: r.status == 'diakhiri-awal' ? Colors.orange : Colors.green,
          ),
        ),
      ),
    );
  }
}