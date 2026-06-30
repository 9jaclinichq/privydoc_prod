function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };
  
  if (typeof window !== "undefined") {
    const patientSession = localStorage.getItem("privydoc_patient_session");
    if (patientSession) {
      try {
        const patient = JSON.parse(patientSession);
        if (patient && patient.phone) {
          headers["X-Patient-Phone"] = patient.phone;
        }
      } catch (e) {}
    }

    const doctorSession = localStorage.getItem("privydoc_doctor_session") || localStorage.getItem("privydoc_current_doctor");
    if (doctorSession) {
      try {
        const doctor = JSON.parse(doctorSession);
        if (doctor && doctor.id) {
          headers["X-Doctor-Id"] = doctor.id;
        }
      } catch (e) {}
    }

    const adminToken = localStorage.getItem("privydoc_admin_token");
    if (adminToken) {
      headers["X-Admin-Auth"] = adminToken;
    }
  }
  
  return headers;
}

export const DATA = {
  async get(table: string, query: string = ""): Promise<any> {
    const res = await fetch(`/api/data/${table}${query}`, {
      headers: getHeaders()
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || `Fetch failed for ${table}`);
    }
    return res.json();
  },

  async post(table: string, row: any): Promise<any> {
    const res = await fetch(`/api/data/${table}`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(row)
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || `Insert failed for ${table}`);
    }
    return res.json();
  },

  async patch(table: string, filter: string, body: any): Promise<any> {
    const res = await fetch(`/api/data/${table}?${filter}`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || `Update failed for ${table}`);
    }
    return res.json();
  },

  async fn(edgeFn: string, body: any): Promise<any> {
    const res = await fetch(`/api/data/fn/${edgeFn}`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || `Edge function ${edgeFn} failed`);
    }
    return res.json();
  }
};
