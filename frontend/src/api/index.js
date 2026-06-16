import axios from 'axios';

const baseURL = '/api';
const TOKEN_KEY = 'dm_sys_token';
const USER_KEY = 'dm_sys_user';

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

function getCachedUser() {
  const value = localStorage.getItem(USER_KEY);
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch (err) {
    localStorage.removeItem(USER_KEY);
    return null;
  }
}

function setCachedUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

axios.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearToken();
      window.dispatchEvent(new Event('auth:logout'));
    }
    return Promise.reject(error);
  }
);

const authApi = {
  login: (data) => axios.post(`${baseURL}/auth/login`, data),
  me: () => axios.get(`${baseURL}/auth/me`),
  changePassword: (data) => axios.put(`${baseURL}/auth/password`, data),
  getCachedUser,
  getToken,
  setCachedUser,
  setToken,
  clearToken
};

const dmApi = {
  list: (params) => axios.get(`${baseURL}/dm`, { params }),
  get: (id) => axios.get(`${baseURL}/dm/${id}`),
  create: (data) => axios.post(`${baseURL}/dm`, data),
  update: (id, data) => axios.put(`${baseURL}/dm/${id}`, data),
  delete: (id) => axios.delete(`${baseURL}/dm/${id}`),
  batchDelete: (ids) => axios.delete(`${baseURL}/dm/batch`, { data: { ids } }),
  import: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return axios.post(`${baseURL}/dm/import`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  export: () => axios.get(`${baseURL}/dm/export`, { responseType: 'blob' })
};

const scriptApi = {
  list: (params) => axios.get(`${baseURL}/script`, { params }),
  get: (id) => axios.get(`${baseURL}/script/${id}`),
  create: (data) => axios.post(`${baseURL}/script`, data),
  update: (id, data) => axios.put(`${baseURL}/script/${id}`, data),
  delete: (id) => axios.delete(`${baseURL}/script/${id}`),
  batchDelete: (ids) => axios.delete(`${baseURL}/script/batch`, { data: { ids } }),
  import: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return axios.post(`${baseURL}/script/import`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  export: () => axios.get(`${baseURL}/script/export`, { responseType: 'blob' }),
  downloadTemplate: () => axios.get(`${baseURL}/script/template`, { responseType: 'blob' })
};

const sessionApi = {
  list: (params) => axios.get(`${baseURL}/session`, { params }),
  get: (id) => axios.get(`${baseURL}/session/${id}`),
  create: (data) => axios.post(`${baseURL}/session`, data),
  update: (id, data) => axios.put(`${baseURL}/session/${id}`, data),
  delete: (id) => axios.delete(`${baseURL}/session/${id}`),
  batchDelete: (ids) => axios.delete(`${baseURL}/session/batch`, { data: { ids } }),
  import: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return axios.post(`${baseURL}/session/import`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  export: () => axios.get(`${baseURL}/session/export`, { responseType: 'blob' }),
  downloadTemplate: () => axios.get(`${baseURL}/session/template`, { responseType: 'blob' })
};

const salaryApi = {
  calculate: (data) => axios.post(`${baseURL}/salary/calculate`, data),
  settle: (data) => axios.post(`${baseURL}/salary/settle`, data),
  settlements: (params) => axios.get(`${baseURL}/salary/settlements`, { params }),
  cancelSettlement: (id) => axios.delete(`${baseURL}/salary/settlements/${id}`),
  downloadTemplate: () => axios.get(`${baseURL}/salary/template`, { responseType: 'blob' }),
  export: () => axios.get(`${baseURL}/salary/export`, { responseType: 'blob' }),
  import: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return axios.post(`${baseURL}/salary/import`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }
};

const reimbursementApi = {
  list: (params) => axios.get(`${baseURL}/reimbursement`, { params }),
  get: (id) => axios.get(`${baseURL}/reimbursement/${id}`),
  create: (data) => {
    return axios.post(`${baseURL}/reimbursement`, data, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  update: (id, data) => {
    return axios.put(`${baseURL}/reimbursement/${id}`, data, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  delete: (id) => axios.delete(`${baseURL}/reimbursement/${id}`),
  batchDelete: (ids) => axios.delete(`${baseURL}/reimbursement/batch`, { data: { ids } }),
  import: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return axios.post(`${baseURL}/reimbursement/import`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  export: () => axios.get(`${baseURL}/reimbursement/export`, { responseType: 'blob' }),
  downloadTemplate: () => axios.get(`${baseURL}/reimbursement/template`, { responseType: 'blob' }),
  summary: (params) => axios.get(`${baseURL}/reimbursement/summary`, { params })
};

const cashflowApi = {
  list: (params) => axios.get(`${baseURL}/cashflow`, { params }),
  get: (id) => axios.get(`${baseURL}/cashflow/${id}`),
  create: (data) => axios.post(`${baseURL}/cashflow`, data),
  update: (id, data) => axios.put(`${baseURL}/cashflow/${id}`, data),
  delete: (id) => axios.delete(`${baseURL}/cashflow/${id}`),
  batchDelete: (ids) => axios.delete(`${baseURL}/cashflow/batch`, { data: { ids } }),
  import: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return axios.post(`${baseURL}/cashflow/import`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  export: () => axios.get(`${baseURL}/cashflow/export`, { responseType: 'blob' }),
  downloadTemplate: () => axios.get(`${baseURL}/cashflow/template`, { responseType: 'blob' }),
  summary: (params) => axios.get(`${baseURL}/cashflow/summary`, { params })
};

const homeApi = {
  summary: (params) => axios.get(`${baseURL}/home/summary`, { params }),
  trend: (params) => axios.get(`${baseURL}/home/trend`, { params })
};

export {
  authApi,
  dmApi,
  scriptApi,
  sessionApi,
  salaryApi,
  reimbursementApi,
  cashflowApi,
  homeApi
};
