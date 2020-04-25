import authReducer from '../../reducers/auth';

test('should set default state', () => {
    const state = authReducer(undefined, { type: '@@INIT' });
    expect(state).toEqual({});
});

test('should set uid for login correctly', () => {
    const uid = 123;
    const state = authReducer(undefined, { type: 'LOGIN', uid });
    expect(state).toEqual({ uid });
});

test('should set uid for logout correctly', () => {
    const state = authReducer({ uid: 'anything' }, { type: 'LOGOUT' });
    expect(state).toEqual({});
});