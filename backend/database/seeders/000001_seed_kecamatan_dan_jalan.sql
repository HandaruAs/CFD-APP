-- ==========================================
-- SEEDER: Kecamatan dan Jalan di Surabaya
-- Tanggal: 24 Agustus 2026
-- ==========================================

DO $$
DECLARE
    sukolilo_id UUID;
    genteng_id UUID;
    tegal_id UUID;
BEGIN
    -- ==========================================
    -- 1. Insert Kecamatan (3 kecamatan)
    -- ==========================================
    -- Sukolilo
    INSERT INTO master_instansi (id, nama_unit, nama_instansi, created_at, updated_at) 
    SELECT gen_random_uuid(), 'Kecamatan', 'Sukolilo', now(), now()
    WHERE NOT EXISTS (SELECT 1 FROM master_instansi WHERE nama_instansi = 'Sukolilo')
    RETURNING id INTO sukolilo_id;
    
    IF sukolilo_id IS NULL THEN
        SELECT id INTO sukolilo_id FROM master_instansi WHERE nama_instansi = 'Sukolilo';
    END IF;

    -- Genteng
    INSERT INTO master_instansi (id, nama_unit, nama_instansi, created_at, updated_at) 
    SELECT gen_random_uuid(), 'Kecamatan', 'Genteng', now(), now()
    WHERE NOT EXISTS (SELECT 1 FROM master_instansi WHERE nama_instansi = 'Genteng')
    RETURNING id INTO genteng_id;
    
    IF genteng_id IS NULL THEN
        SELECT id INTO genteng_id FROM master_instansi WHERE nama_instansi = 'Genteng';
    END IF;

    -- Tegalsari
    INSERT INTO master_instansi (id, nama_unit, nama_instansi, created_at, updated_at) 
    SELECT gen_random_uuid(), 'Kecamatan', 'Tegalsari', now(), now()
    WHERE NOT EXISTS (SELECT 1 FROM master_instansi WHERE nama_instansi = 'Tegalsari')
    RETURNING id INTO tegal_id;
    
    IF tegal_id IS NULL THEN
        SELECT id INTO tegal_id FROM master_instansi WHERE nama_instansi = 'Tegalsari';
    END IF;

    -- ==========================================
    -- 2. Insert Jalan (15 jalan)
    -- ==========================================
    -- Sukolilo (5 jalan)
    INSERT INTO master_jalan (id, kode_jalan, nama_jalan, kapasitas, created_at, updated_at) 
    SELECT gen_random_uuid(), 'ITS', 'Jalan Raya ITS', 15, now(), now()
    WHERE NOT EXISTS (SELECT 1 FROM master_jalan WHERE kode_jalan = 'ITS');
    
    INSERT INTO master_jalan (id, kode_jalan, nama_jalan, kapasitas, created_at, updated_at) 
    SELECT gen_random_uuid(), 'KERTAJAYA', 'Jalan Kertajaya', 12, now(), now()
    WHERE NOT EXISTS (SELECT 1 FROM master_jalan WHERE kode_jalan = 'KERTAJAYA');
    
    INSERT INTO master_jalan (id, kode_jalan, nama_jalan, kapasitas, created_at, updated_at) 
    SELECT gen_random_uuid(), 'SUKOLILO', 'Jalan Sukolilo', 10, now(), now()
    WHERE NOT EXISTS (SELECT 1 FROM master_jalan WHERE kode_jalan = 'SUKOLILO');
    
    INSERT INTO master_jalan (id, kode_jalan, nama_jalan, kapasitas, created_at, updated_at) 
    SELECT gen_random_uuid(), 'MULYOSARI', 'Jalan Mulyosari', 8, now(), now()
    WHERE NOT EXISTS (SELECT 1 FROM master_jalan WHERE kode_jalan = 'MULYOSARI');
    
    INSERT INTO master_jalan (id, kode_jalan, nama_jalan, kapasitas, created_at, updated_at) 
    SELECT gen_random_uuid(), 'GUBENG', 'Jalan Gubeng', 20, now(), now()
    WHERE NOT EXISTS (SELECT 1 FROM master_jalan WHERE kode_jalan = 'GUBENG');

    -- Genteng (5 jalan)
    INSERT INTO master_jalan (id, kode_jalan, nama_jalan, kapasitas, created_at, updated_at) 
    SELECT gen_random_uuid(), 'DARMO', 'Jalan Darmo', 20, now(), now()
    WHERE NOT EXISTS (SELECT 1 FROM master_jalan WHERE kode_jalan = 'DARMO');
    
    INSERT INTO master_jalan (id, kode_jalan, nama_jalan, kapasitas, created_at, updated_at) 
    SELECT gen_random_uuid(), 'TUNJUNGAN', 'Jalan Tunjungan', 25, now(), now()
    WHERE NOT EXISTS (SELECT 1 FROM master_jalan WHERE kode_jalan = 'TUNJUNGAN');
    
    INSERT INTO master_jalan (id, kode_jalan, nama_jalan, kapasitas, created_at, updated_at) 
    SELECT gen_random_uuid(), 'GENTENG', 'Jalan Genteng', 10, now(), now()
    WHERE NOT EXISTS (SELECT 1 FROM master_jalan WHERE kode_jalan = 'GENTENG');
    
    INSERT INTO master_jalan (id, kode_jalan, nama_jalan, kapasitas, created_at, updated_at) 
    SELECT gen_random_uuid(), 'BALONG', 'Jalan Balong', 12, now(), now()
    WHERE NOT EXISTS (SELECT 1 FROM master_jalan WHERE kode_jalan = 'BALONG');
    
    INSERT INTO master_jalan (id, kode_jalan, nama_jalan, kapasitas, created_at, updated_at) 
    SELECT gen_random_uuid(), 'PEMUDA', 'Jalan Pemuda', 18, now(), now()
    WHERE NOT EXISTS (SELECT 1 FROM master_jalan WHERE kode_jalan = 'PEMUDA');

    -- Tegalsari (5 jalan)
    INSERT INTO master_jalan (id, kode_jalan, nama_jalan, kapasitas, created_at, updated_at) 
    SELECT gen_random_uuid(), 'TEGALSARI', 'Jalan Tegalsari', 15, now(), now()
    WHERE NOT EXISTS (SELECT 1 FROM master_jalan WHERE kode_jalan = 'TEGALSARI');
    
    INSERT INTO master_jalan (id, kode_jalan, nama_jalan, kapasitas, created_at, updated_at) 
    SELECT gen_random_uuid(), 'DR-SOETOMO', 'Jalan Dr. Soetomo', 20, now(), now()
    WHERE NOT EXISTS (SELECT 1 FROM master_jalan WHERE kode_jalan = 'DR-SOETOMO');
    
    INSERT INTO master_jalan (id, kode_jalan, nama_jalan, kapasitas, created_at, updated_at) 
    SELECT gen_random_uuid(), 'KALIMANTAN', 'Jalan Kalimantan', 10, now(), now()
    WHERE NOT EXISTS (SELECT 1 FROM master_jalan WHERE kode_jalan = 'KALIMANTAN');
    
    INSERT INTO master_jalan (id, kode_jalan, nama_jalan, kapasitas, created_at, updated_at) 
    SELECT gen_random_uuid(), 'SUMATRA', 'Jalan Sumatra', 12, now(), now()
    WHERE NOT EXISTS (SELECT 1 FROM master_jalan WHERE kode_jalan = 'SUMATRA');
    
    INSERT INTO master_jalan (id, kode_jalan, nama_jalan, kapasitas, created_at, updated_at) 
    SELECT gen_random_uuid(), 'JAVA', 'Jalan Java', 8, now(), now()
    WHERE NOT EXISTS (SELECT 1 FROM master_jalan WHERE kode_jalan = 'JAVA');

    -- ==========================================
    -- 3. Mapping Jalan ke Kecamatan
    -- ==========================================
    -- Sukolilo
    INSERT INTO jalan_instansi (id, jalan_id, instansi_id)
    SELECT gen_random_uuid(), mj.id, sukolilo_id
    FROM master_jalan mj
    WHERE mj.kode_jalan IN ('ITS', 'KERTAJAYA', 'SUKOLILO', 'MULYOSARI', 'GUBENG')
    AND NOT EXISTS (
        SELECT 1 FROM jalan_instansi ji 
        WHERE ji.jalan_id = mj.id AND ji.instansi_id = sukolilo_id
    );

    -- Genteng
    INSERT INTO jalan_instansi (id, jalan_id, instansi_id)
    SELECT gen_random_uuid(), mj.id, genteng_id
    FROM master_jalan mj
    WHERE mj.kode_jalan IN ('DARMO', 'TUNJUNGAN', 'GENTENG', 'BALONG', 'PEMUDA')
    AND NOT EXISTS (
        SELECT 1 FROM jalan_instansi ji 
        WHERE ji.jalan_id = mj.id AND ji.instansi_id = genteng_id
    );

    -- Tegalsari
    INSERT INTO jalan_instansi (id, jalan_id, instansi_id)
    SELECT gen_random_uuid(), mj.id, tegal_id
    FROM master_jalan mj
    WHERE mj.kode_jalan IN ('TEGALSARI', 'DR-SOETOMO', 'KALIMANTAN', 'SUMATRA', 'JAVA')
    AND NOT EXISTS (
        SELECT 1 FROM jalan_instansi ji 
        WHERE ji.jalan_id = mj.id AND ji.instansi_id = tegal_id
    );

    -- ==========================================
    -- 4. Tambahkan Sesi CFD Aktif
    -- ==========================================
    INSERT INTO cfd_sessions (id, nama_sesi, tanggal, jam_mulai, jam_selesai, status, is_active, created_at, updated_at) 
    SELECT 
        gen_random_uuid(),
        'CFD Minggu 28 Agustus 2026',
        '2026-08-28',
        '06:00',
        '10:00',
        'aktif',
        true,
        now(),
        now()
    WHERE NOT EXISTS (
        SELECT 1 FROM cfd_sessions WHERE tanggal = '2026-08-28'
    );

    -- ==========================================
    -- 5. Verifikasi (tampilkan di terminal)
    -- ==========================================
    RAISE NOTICE '=== SEEDER COMPLETE ===';
    RAISE NOTICE 'Kecamatan: %', (SELECT COUNT(*) FROM master_instansi);
    RAISE NOTICE 'Jalan: %', (SELECT COUNT(*) FROM master_jalan);
    RAISE NOTICE 'Mapping: %', (SELECT COUNT(*) FROM jalan_instansi);
END $$;

-- ==========================================
-- Tampilkan hasil mapping
-- ==========================================
SELECT 
    mi.nama_instansi AS kecamatan,
    mj.nama_jalan,
    mj.kapasitas
FROM master_jalan mj
JOIN jalan_instansi ji ON mj.id = ji.jalan_id
JOIN master_instansi mi ON mi.id = ji.instansi_id
ORDER BY mi.nama_instansi, mj.nama_jalan;