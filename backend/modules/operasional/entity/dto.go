package entity

type UpdateSesiRequest struct {
	JamMulai          string `json:"jamMulai" validate:"required"`
	JamSelesaiRencana string `json:"jamSelesaiRencana" validate:"required"`
}

type UpdatePendaftaranRequest struct {
	IsOpen   bool    `json:"isOpen"`
	JamBuka  *string `json:"jamBuka"`
	JamTutup *string `json:"jamTutup"`
	Link     *string `json:"linkPendaftaran"`
}

type StatusOperasionalResponse struct {
	Pendaftaran PendaftaranStatusDTO `json:"pendaftaran"`
	Sesi        *SesiAktifDTO        `json:"sesi"`
	Riwayat     []RiwayatSesiDTO     `json:"riwayat"`
}

type PendaftaranStatusDTO struct {
	IsOpen          bool    `json:"isOpen"`
	LinkPendaftaran *string `json:"linkPendaftaran"`
	JamBuka         *string `json:"jamBuka"`
	JamTutup        *string `json:"jamTutup"`
}

type SesiAktifDTO struct {
	ID                string `json:"id"`
	Tanggal           string `json:"tanggal"`
	JamMulai          string `json:"jamMulai"`
	JamSelesaiRencana string `json:"jamSelesaiRencana"`
	Status            string `json:"status"`
	Aktif             bool   `json:"aktif"`
	SisaMenit         int    `json:"sisaMenit"`
	TotalMenit        int    `json:"totalMenit"`
}

type RiwayatSesiDTO struct {
	Tanggal    string `json:"tanggal"`
	JamMulai   string `json:"jamMulai"`
	JamSelesai string `json:"jamSelesai"`
	Durasi     string `json:"durasi"`
	Status     string `json:"status"`
}

type JadwalMingguanDTO struct {
	Hari              string `json:"hari"`
	JamMulai          string `json:"jamMulai"`
	JamSelesaiRencana string `json:"jamSelesaiRencana"`
	IsActive          bool   `json:"isActive"`
}

type UpdateJadwalMingguanRequest struct {
	Hari              string `json:"hari" binding:"required"`
	JamMulai          string `json:"jamMulai" binding:"required"`
	JamSelesaiRencana string `json:"jamSelesaiRencana" binding:"required"`
	IsActive          bool   `json:"isActive"`
}