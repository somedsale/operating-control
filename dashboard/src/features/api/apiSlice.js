// src/features/data/dataSlice.js
import { createSlice } from '@reduxjs/toolkit';
import { getAllLightings } from './apiClient';

export const fetchLightings = () => async (dispatch) => {
  dispatch(fetchDataPending());
  try {
    const response = await getAllLightings();
    dispatch(fetchLightingsSuccess(response.data));
  } catch (error) {
    dispatch(fetchDataFailure(error.message));
  }
};

// export const fetchProducts = () => async (dispatch) => {
//   dispatch(fetchDataPending());
//   try {
//     const response = await getProducts();
//     dispatch(fetchProductsSuccess(response.data));
//   } catch (error) {
//     dispatch(fetchDataFailure(error.message));
//   }
// };

const dataSlice = createSlice({
  name: 'data',
  initialState: { lightings: [], loading: false, error: null },
  reducers: {
    fetchDataPending(state) {
      state.loading = true;
    },
    fetchLightingsSuccess(state, action) {
      state.loading = false;
      state.lightings = action.payload;
    },
    // fetchProductsSuccess(state, action) {
    //   state.loading = false;
    //   state.products = action.payload;
    // },
    fetchDataFailure(state, action) {
      state.loading = false;
      state.error = action.payload;
    },
  },
});

export const { fetchDataPending, fetchLightingsSuccess, fetchDataFailure } =
  dataSlice.actions;
export default dataSlice.reducer;