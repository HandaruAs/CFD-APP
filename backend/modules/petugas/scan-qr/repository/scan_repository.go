package repository

import (
    "context"
    "time"

    "cfd-backend/modules/petugas/scan-qr/entity"
    "github.com/jackc/pgx/v5"
    "github.com/jackc/pgx/v5/pgxpool"
)

type ScanRepository interface {
    GetPedagangByID(ctx context.Context, id string) (*entity.PedagangProfile, error)
    CreateKehadiran(ctx context.Context, kehadiran *entity.KehadiranPedagang) error
    GetKehadiranByPedagangAndSession(ctx context.Context, pedagangID, sessionID string) (*entity.KehadiranPedagang, error)
    GetRiwayatScanHariIni(ctx context.Context, petugasID string, tanggal time.Time) ([]entity.KehadiranWithPedagang, error)
    GetActiveSessionToday(ctx context.Context, t time.Time) (*entity.CfdSession, error)
}

type scanRepository struct {
    db *pgxpool.Pool
}

func NewScanRepository(db *pgxpool.Pool) ScanRepository {
    return &scanRepository{db: db}
}

func (r *scanRepository) GetPedagangByID(ctx context.Context, id string) (*entity.PedagangProfile, error) {
    query := `
        SELECT 
            p.id, p.user_id, p.nik, p.nama_usaha, p.jenis_dagangan::text, p.alamat,   -- <-- ubah di sini
            p.status_verifikasi, p.catatan, p.verified_by, p.verified_at,
            p.perkiraan_harga, p.phone, p.submitted_at,
            p.created_at, p.updated_at, p.deleted_at,
            COALESCE(u.name, '') AS pemilik
        FROM pedagang_profiles p
        JOIN users u ON p.user_id = u.id
        WHERE p.id = $1 AND p.deleted_at IS NULL
    `
    var profile entity.PedagangProfile
    err := r.db.QueryRow(ctx, query, id).Scan(
        &profile.ID, &profile.UserID, &profile.NIK, &profile.NamaUsaha,
        &profile.JenisDagangan, &profile.Alamat, &profile.StatusVerifikasi,
        &profile.Catatan, &profile.VerifiedBy, &profile.VerifiedAt,
        &profile.PerkiraanHarga, &profile.Phone, &profile.SubmittedAt,
        &profile.CreatedAt, &profile.UpdatedAt, &profile.DeletedAt,
        &profile.Pemilik,
    )
    if err == pgx.ErrNoRows {
        return nil, nil
    }
    if err != nil {
        return nil, err
    }
    return &profile, nil
}

func (r *scanRepository) CreateKehadiran(ctx context.Context, kehadiran *entity.KehadiranPedagang) error {
    query := `
        INSERT INTO kehadiran_pedagang (
            id, pedagang_id, session_id, check_in_at, scanned_by, catatan, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `
    now := time.Now()
    _, err := r.db.Exec(ctx, query,
        kehadiran.ID,
        kehadiran.PedagangID,
        kehadiran.SessionID,
        kehadiran.CheckInAt,
        kehadiran.ScannedBy,
        kehadiran.Catatan,
        now,
        now,
    )
    return err
}

func (r *scanRepository) GetKehadiranByPedagangAndSession(ctx context.Context, pedagangID, sessionID string) (*entity.KehadiranPedagang, error) {
    query := `
        SELECT id, pedagang_id, session_id, check_in_at, scanned_by, catatan, created_at, updated_at, deleted_at
        FROM kehadiran_pedagang
        WHERE pedagang_id = $1 AND session_id = $2 AND deleted_at IS NULL
    `
    var k entity.KehadiranPedagang
    err := r.db.QueryRow(ctx, query, pedagangID, sessionID).Scan(
        &k.ID, &k.PedagangID, &k.SessionID, &k.CheckInAt, &k.ScannedBy,
        &k.Catatan, &k.CreatedAt, &k.UpdatedAt, &k.DeletedAt,
    )
    if err == pgx.ErrNoRows {
        return nil, nil
    }
    if err != nil {
        return nil, err
    }
    return &k, nil
}

func (r *scanRepository) GetRiwayatScanHariIni(ctx context.Context, petugasID string, tanggal time.Time) ([]entity.KehadiranWithPedagang, error) {
    query := `
        SELECT 
            k.id, k.pedagang_id, k.session_id, k.check_in_at, k.scanned_by, 
            k.catatan, k.created_at, k.updated_at, k.deleted_at,
            COALESCE(p.nama_usaha, '') AS nama_usaha,
            COALESCE(u.name, '') AS pemilik,
            COALESCE(
                UPPER(SUBSTRING(u.name, 1, 1)) || 
                UPPER(SUBSTRING(SPLIT_PART(u.name, ' ', 2), 1, 1)),
                UPPER(SUBSTRING(u.name, 1, 2))
            ) AS inisial,
            COALESCE(p.jenis_dagangan::text, '') AS jenis_dagangan,   -- <-- ubah di sini
            COALESCE(p.alamat, '') AS lokasi_lapak
        FROM kehadiran_pedagang k
        JOIN pedagang_profiles p ON k.pedagang_id = p.id
        JOIN users u ON p.user_id = u.id
        WHERE k.scanned_by = $1 
            AND DATE(k.check_in_at) = $2
            AND k.deleted_at IS NULL
        ORDER BY k.check_in_at DESC
        LIMIT 50
    `
    rows, err := r.db.Query(ctx, query, petugasID, tanggal)
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    var results []entity.KehadiranWithPedagang
    for rows.Next() {
        var k entity.KehadiranWithPedagang
        err := rows.Scan(
            &k.ID, &k.PedagangID, &k.SessionID, &k.CheckInAt, &k.ScannedBy,
            &k.Catatan, &k.CreatedAt, &k.UpdatedAt, &k.DeletedAt,
            &k.NamaUsaha, &k.Pemilik, &k.Inisial, &k.JenisDagangan, &k.LokasiLapak,
        )
        if err != nil {
            return nil, err
        }
        results = append(results, k)
    }
    return results, nil
}

func (r *scanRepository) GetActiveSessionToday(ctx context.Context, t time.Time) (*entity.CfdSession, error) {
    query := `
        SELECT 
            id, nama_sesi, tanggal, jam_mulai, jam_selesai, 
            jam_selesai_aktual, status, created_by, is_active, created_at, updated_at, deleted_at
        FROM cfd_sessions
        WHERE tanggal = $1 
            AND status = 'aktif'
            AND is_active = true
            AND deleted_at IS NULL
        LIMIT 1
    `
    var session entity.CfdSession
    err := r.db.QueryRow(ctx, query, t.Format("2006-01-02")).Scan(
        &session.ID,
        &session.NamaSesi,
        &session.Tanggal,
        &session.JamMulai,
        &session.JamSelesaiRencana,
        &session.JamSelesaiAktual,
        &session.Status,
        &session.CreatedBy,
        &session.IsActive,
        &session.CreatedAt,
        &session.UpdatedAt,
        &session.DeletedAt,
    )
    if err == pgx.ErrNoRows {
        return nil, nil
    }
    if err != nil {
        return nil, err
    }
    return &session, nil
}