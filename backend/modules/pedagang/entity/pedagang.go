package entity

// PengajuanUsahaRequest adalah DTO input dari JSON saat user mengajukan usaha.
type PengajuanUsahaRequest struct {
	NIK            string `json:"nik" binding:"required,len=16"`
	NamaUsaha      string `json:"nama_usaha" binding:"required"`
	JenisDagangan  string `json:"jenis_dagangan" binding:"required"`
	PerkiraanHarga string `json:"perkiraan_harga" binding:"required"` // <-- Tambahan
	Alamat         string `json:"alamat" binding:"required"`
}

// PengajuanStatus adalah representasi data dari tabel pedagang_profiles di database.
type PengajuanStatus struct {
	ID                string  `db:"id"`
	NIK               string  `db:"nik"`
	NamaUsaha         string  `db:"nama_usaha"`
	JenisDagangan     string  `db:"jenis_dagangan"`
	PerkiraanHarga    string  `db:"perkiraan_harga"` // <-- Tambahan
	Alamat            string  `db:"alamat"`
	StatusVerifikasi  string  `db:"status_verifikasi"`
	Catatan           *string `db:"catatan"`
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
	NamaUsaha        *string `json:"namaUsaha"`
	JenisDagangan    *string `json:"jenisDagangan"`
	PerkiraanHarga   *string `json:"perkiraanHarga"` // <-- Tambahan
	Alamat           *string `json:"alamat"`
	StatusVerifikasi *string `json:"statusVerifikasi"`
}

type ListPedagangResponse struct {
	Users []PedagangUserDTO `json:"users"`
	Total int               `json:"total"`
}

type PedagangStatsResponse struct {
	Total    int `json:"total"`
	Active   int `json:"active"`
	Pending  int `json:"pending"`
	Suspended int `json:"suspended"`
}