package entity

// PengajuanUsahaRequest adalah DTO input dari JSON saat user mengajukan usaha.
type PengajuanUsahaRequest struct {
	NIK           string `json:"nik" binding:"required,len=16"`
	NamaUsaha     string `json:"nama_usaha" binding:"required"`
	JenisDagangan string `json:"jenis_dagangan" binding:"required"`
	Alamat        string `json:"alamat" binding:"required"`
}

// PengajuanStatus adalah representasi data dari tabel pedagang_profiles di database.
type PengajuanStatus struct {
	ID                string  `db:"id"`
	NIK               string  `db:"nik"`
	NamaUsaha         string  `db:"nama_usaha"`
	JenisDagangan     string  `db:"jenis_dagangan"`
	Alamat            string  `db:"alamat"`
	StatusVerifikasi  string  `db:"status_verifikasi"`
	Catatan           *string `db:"catatan"`
}