package entity

// PengajuanUsahaRequest adalah DTO input dari JSON saat pedagang mengajukan usaha
// sendiri (self-service, form single-page). Alamat & PerkiraanHarga sengaja
// gak diminta lagi di sini -- kolomnya tetap ada di DB, cuma diisi belakangan.
type PengajuanUsahaRequest struct {
	NIK           string `json:"nik" validate:"required,len=16"`
	NamaLengkap   string `json:"nama_lengkap" validate:"required"`
	TanggalLahir  string `json:"tanggal_lahir" validate:"required,datetime=2006-01-02"` 
	NamaUsaha     string `json:"nama_usaha" validate:"required"`
	JenisDagangan string `json:"jenis_dagangan" validate:"required,oneof=makanan_minuman bukan_makanan_minuman"`
	JenisLapak    string `json:"jenis_lapak" validate:"required,oneof=rombong meja"`
}

// PengajuanStatus adalah representasi data dari tabel pedagang_profiles di database.
// Field yang nullable dikasih tanda * karena pedagang lama (sebelum kolom baru
// ini ada) bisa aja belum punya data ini.
type PengajuanStatus struct {
	ID               string  `db:"id"`
	NIK              string  `db:"nik"`
	NamaLengkap      *string `db:"nama_lengkap"`
	TanggalLahir     *string `db:"tanggal_lahir"`
	NamaUsaha        string  `db:"nama_usaha"`
	JenisDagangan    string  `db:"jenis_dagangan"`
	JenisLapak       *string `db:"jenis_lapak"`
	PerkiraanHarga   *string `db:"perkiraan_harga"`
	Alamat           *string `db:"alamat"`
	StatusVerifikasi string  `db:"status_verifikasi"`
	Catatan          *string `db:"catatan"`
}

// PedagangUserDTO adalah bentuk data pedagang untuk response JSON (dipakai tabel FE).
type PedagangUserDTO struct {
	ID               string  `json:"id"`
	Name             string  `json:"name"`
	Email            string  `json:"email"`
	Phone            string  `json:"phone"`
	JoinedAt         string  `json:"joinedAt"`
	Active           bool    `json:"active"`
	Initial          string  `json:"initial"`
	NIK              *string `json:"nik"`
	NamaLengkap      *string `json:"namaLengkap"`
	TanggalLahir     *string `json:"tanggalLahir"`
	NamaUsaha        *string `json:"namaUsaha"`
	JenisDagangan    *string `json:"jenisDagangan"`
	JenisLapak       *string `json:"jenisLapak"`
	PerkiraanHarga   *string `json:"perkiraanHarga"`
	Alamat           *string `json:"alamat"`
	StatusVerifikasi *string `json:"statusVerifikasi"`
}

type ListPedagangResponse struct {
	Users []PedagangUserDTO `json:"users"`
	Total int               `json:"total"`
}

type PedagangStatsResponse struct {
	Total     int `json:"total"`
	Active    int `json:"active"`
	Pending   int `json:"pending"`
	Suspended int `json:"suspended"`
}