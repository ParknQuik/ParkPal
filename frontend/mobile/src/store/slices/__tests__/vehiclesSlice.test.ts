import { configureStore } from '@reduxjs/toolkit';
import vehiclesReducer, {
  createVehicle,
  deleteVehicle,
  getVehicles,
  setDefaultVehicle,
  updateVehicle,
} from '../vehiclesSlice';
import { vehiclesAPI } from '../../../services/api';

jest.mock('../../../services/api', () => ({
  vehiclesAPI: {
    createVehicle: jest.fn(),
    deleteVehicle: jest.fn(),
    getVehicles: jest.fn(),
    setDefaultVehicle: jest.fn(),
    updateVehicle: jest.fn(),
  },
}));

const createStore = () => configureStore({ reducer: { vehicles: vehiclesReducer } });

const axiosError = (data: unknown, status = 409) => ({
  response: {
    data,
    status,
    statusText: 'Conflict',
  },
});

describe('vehiclesSlice', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('stores createVehicle Axios errors as strings', async () => {
    const store = createStore();
    (vehiclesAPI.createVehicle as jest.Mock).mockRejectedValue(
      axiosError({ error: { message: 'License plate already exists' } })
    );

    const action = await store.dispatch(createVehicle({
      make: 'Toyota',
      model: 'Vios',
      year: 2024,
      color: 'White',
      licensePlate: 'ABC1234',
    }));

    expect(action.payload).toBe('License plate already exists');
    expect(store.getState().vehicles.error).toBe('License plate already exists');
  });

  it('normalizes vehicle thunk failures to string state errors', async () => {
    const store = createStore();
    (vehiclesAPI.getVehicles as jest.Mock).mockRejectedValueOnce(axiosError({ message: 'Unable to load vehicles' }, 500));
    (vehiclesAPI.updateVehicle as jest.Mock).mockRejectedValueOnce(new Error('Unable to update vehicle'));
    (vehiclesAPI.deleteVehicle as jest.Mock).mockRejectedValueOnce({ request: {} });
    (vehiclesAPI.setDefaultVehicle as jest.Mock).mockRejectedValueOnce(axiosError({}, 500));

    await store.dispatch(getVehicles());
    expect(store.getState().vehicles.error).toBe('Unable to load vehicles');

    await store.dispatch(updateVehicle({ id: 1, data: { color: 'Blue' } }));
    expect(store.getState().vehicles.error).toBe('Unable to update vehicle');

    await store.dispatch(deleteVehicle(1));
    expect(store.getState().vehicles.error).toBe('No response from server');

    await store.dispatch(setDefaultVehicle(1));
    expect(store.getState().vehicles.error).toBe('HTTP 500: Conflict');
  });
});
