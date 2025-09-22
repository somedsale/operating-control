// src/services/apiClient.js
import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.REACT_APP_BASE_URL, // Root base URL
  headers: {
    'Content-Type': 'application/json',
    
    // Add Authorization if needed
    // 'Authorization': `Bearer ${localStorage.getItem('token')}`,
  },
});
//api lighting
export const getAllLightings = () => apiClient.get('/lightings');
export const getStatusLightingById = (id) => apiClient.get(`/lightings/status/${id}`);
export const TurnOnLightingById = (id) => apiClient.get(`/lightings/turn-on/${id}`);
export const TurnOffLightingById = (id) => apiClient.get(`/lightings/turn-off/${id}`);
//api control

export const getAllControls = () => apiClient.get('/control');
export const getStatusControlById = (id) => apiClient.get(`/control/status/${id}`);
export const TurnOnControlById = (id) => apiClient.get(`/control/turn-on/${id}`);
export const TurnOffControlById = (id) => apiClient.get(`/control/turn-off/${id}`);

//api ventilation
export const getVentilation = () => apiClient.get('/ventilation');
export const getStatusVentilation = () => apiClient.get(`/ventilation/status`);
export const TurnOnVentilation = () => apiClient.get(`/ventilation/turn-on`);
export const TurnOffVentilation = () => apiClient.get(`/ventilation/turn-off`);
export const decreaseVentilation = () => apiClient.get(`/ventilation/decrease`);
export const increaseVentilation = () => apiClient.get(`/ventilation/increase`);


//api power
export const getAllPower = () => apiClient.get('/power');
export const getStatusPower = (id) => apiClient.get(`/power/status/${id}`);

//api gas
export const getAllGas = () => apiClient.get('/gas');
export const getStatusGas = (id) => apiClient.get(`/gas/status/${id}`);

//api temperature
export const getTemperature = () => apiClient.get('/sensor/temp');
export const getHumidity = () => apiClient.get('/sensor/humidity');


// export const getProducts = () => apiClient.get('/products/list');
// export const getProductById = (id) => apiClient.get(`/products/${id}`);