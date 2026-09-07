import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/core/widgets/layouts/main_layout.dart';
import 'package:mobile/features/petugas/domain/entities/sisa_lapak.dart';
import 'package:mobile/features/petugas/presentation/providers/sisa_lapak_provider.dart';
import 'package:mobile/features/petugas/presentation/providers/sisa_lapak_state.dart';
import 'package:mobile/features/petugas/presentation/providers/sisa_lapak_notifier.dart';

const _brandColor = Color(0xFF1C3F7C);

class SisaLapakScreen extends ConsumerStatefulWidget {
  const SisaLapakScreen({super.key});

  @override
  ConsumerState<SisaLapakScreen> createState() => _SisaLapakScreenState();
}

class _SisaLapakScreenState extends ConsumerState<SisaLapakScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(sisaLapakProvider.notifier).loadAll());
  }

  void _showSnack(bool success, String successMsg) {
    if (!mounted) return;
    final error = ref.read(sisaLapakProvider).error;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(success ? successMsg : (error ?? 'Gagal memproses.'))),
    );
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(sisaLapakProvider);

    return MainLayout(
      title: 'Sisa Lapak',
      body: RefreshIndicator(
        onRefresh: () => ref.read(sisaLapakProvider.notifier).loadAll(),
        child: _buildBody(state),
      ),
    );
  }

  Widget _buildBody(SisaLapakState state) {
    if (state.isLoading && state.kecamatanList.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    if (state.error != null && state.kecamatanList.isEmpty) {
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
              onPressed: () => ref.read(sisaLapakProvider.notifier).loadAll(),
              style: ElevatedButton.styleFrom(backgroundColor: _brandColor),
              child: const Text('Coba Lagi', style: TextStyle(color: Colors.white)),
            ),
          ),
        ],
      );
    }

    return Stack(
      children: [
        ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 88),
          children: state.kecamatanList.isEmpty
              ? const [
                  SizedBox(height: 80),
                  Center(child: Text('Belum ada data kecamatan/jalan.')),
                ]
              : state.kecamatanList.map(_buildKecamatanCard).toList(),
        ),
        Positioned(
          right: 16,
          bottom: 16,
          child: FloatingActionButton.extended(
            backgroundColor: _brandColor,
            onPressed: state.isSaving ? null : () => _openJalanDialog(),
            icon: const Icon(Icons.add, color: Colors.white),
            label: const Text('Tambah Jalan', style: TextStyle(color: Colors.white)),
          ),
        ),
      ],
    );
  }

  Widget _buildKecamatanCard(KecamatanData kec) {
    final totalKuota = kec.jalan.fold<int>(0, (sum, j) => sum + j.kuota);
    final totalTerisi = kec.jalan.fold<int>(0, (sum, j) => sum + j.terisi);

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: ExpansionTile(
        title: Text(kec.kecamatan, style: const TextStyle(fontWeight: FontWeight.bold)),
        subtitle: Text('$totalTerisi / $totalKuota terisi • ${kec.jalan.length} jalan'),
        children: kec.jalan.map(_buildJalanTile).toList(),
      ),
    );
  }

  Widget _buildJalanTile(JalanData jalan) {
    final persen = jalan.kuota == 0 ? 0.0 : jalan.terisi / jalan.kuota;

    return ListTile(
      title: Text('${jalan.kodeJalan} - ${jalan.nama}'),
      subtitle: Padding(
        padding: const EdgeInsets.only(top: 6),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(6),
              child: LinearProgressIndicator(
                value: persen.clamp(0, 1),
                minHeight: 6,
                backgroundColor: const Color(0xFFE5E7EB),
                color: jalan.sisa == 0 ? Colors.red : _brandColor,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              jalan.sisa == 0
                  ? 'Penuh (${jalan.terisi}/${jalan.kuota})'
                  : 'Sisa ${jalan.sisa} dari ${jalan.kuota}',
              style: const TextStyle(fontSize: 12, color: Colors.black54),
            ),
          ],
        ),
      ),
      trailing: PopupMenuButton<String>(
        onSelected: (value) {
          if (value == 'edit') _openJalanDialog(jalan: jalan);
          if (value == 'delete') _confirmDelete(jalan);
        },
        itemBuilder: (_) => const [
          PopupMenuItem(value: 'edit', child: Text('Edit')),
          PopupMenuItem(value: 'delete', child: Text('Hapus', style: TextStyle(color: Colors.red))),
        ],
      ),
    );
  }

  Future<void> _confirmDelete(JalanData jalan) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Hapus Jalan?'),
        content: Text('Jalan "${jalan.nama}" akan dihapus permanen.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Batal')),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Hapus', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
    if (confirm != true) return;
    final ok = await ref.read(sisaLapakProvider.notifier).deleteJalan(jalan.id);
    _showSnack(ok, 'Jalan berhasil dihapus.');
  }

  Future<void> _openJalanDialog({JalanData? jalan}) async {
    final isEdit = jalan != null;
    final kodeController = TextEditingController(text: jalan?.kodeJalan ?? '');
    final namaController = TextEditingController(text: jalan?.nama ?? '');
    final kapasitasController = TextEditingController(text: jalan?.kuota.toString() ?? '');
    String? selectedInstansiId;

    final instansiList = ref.read(sisaLapakProvider).instansiList;
    final notifier = ref.read(sisaLapakProvider.notifier);
    final formKey = GlobalKey<FormState>();

    await showDialog(
      context: context,
      builder: (dialogContext) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              title: Text(isEdit ? 'Edit Jalan' : 'Tambah Jalan'),
              content: Form(
                key: formKey,
                child: SingleChildScrollView(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (!isEdit) ...[
                        DropdownButtonFormField<String>(
                          decoration: const InputDecoration(labelText: 'Kecamatan / Instansi'),
                          items: instansiList
                              .map((i) => DropdownMenuItem(value: i.id, child: Text(i.nama)))
                              .toList(),
                          onChanged: (v) => setDialogState(() => selectedInstansiId = v),
                          validator: (v) => v == null ? 'Wajib dipilih' : null,
                        ),
                        const SizedBox(height: 12),
                      ],
                      TextFormField(
                        controller: kodeController,
                        decoration: const InputDecoration(labelText: 'Kode Jalan'),
                        validator: (v) => (v == null || v.trim().isEmpty) ? 'Wajib diisi' : null,
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: namaController,
                        decoration: const InputDecoration(labelText: 'Nama Jalan'),
                        validator: (v) => (v == null || v.trim().isEmpty) ? 'Wajib diisi' : null,
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: kapasitasController,
                        decoration: const InputDecoration(labelText: 'Kapasitas'),
                        keyboardType: TextInputType.number,
                        validator: (v) {
                          final n = int.tryParse(v ?? '');
                          if (n == null || n <= 0) return 'Harus angka > 0';
                          return null;
                        },
                      ),
                    ],
                  ),
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(dialogContext),
                  child: const Text('Batal'),
                ),
                ElevatedButton(
                  onPressed: () async {
                    if (!formKey.currentState!.validate()) return;
                    Navigator.pop(dialogContext);

                    final kapasitas = int.parse(kapasitasController.text.trim());
                    final ok = isEdit
                        ? await notifier.updateJalan(
                            id: jalan.id,
                            kodeJalan: kodeController.text.trim(),
                            namaJalan: namaController.text.trim(),
                            kapasitas: kapasitas,
                          )
                        : await notifier.createJalan(
                            kodeJalan: kodeController.text.trim(),
                            namaJalan: namaController.text.trim(),
                            kapasitas: kapasitas,
                            instansiId: selectedInstansiId!,
                          );
                    _showSnack(ok, isEdit ? 'Jalan berhasil diubah.' : 'Jalan berhasil ditambahkan.');
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
}