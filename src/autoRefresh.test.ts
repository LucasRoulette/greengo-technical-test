import axios, { AxiosRequestConfig } from "axios";
import { AutoRefresh } from "./autoRefresh";
import MockAdapter from "axios-mock-adapter";

const baseUrl: string = AutoRefresh['baseUrl'];
const refreshPath: string = AutoRefresh['refreshPath'];
const loginPath: string = AutoRefresh['loginPath'];
const axiosMock: MockAdapter = new MockAdapter(axios);
const validClientId = 'validClientId';
const validClientSecret = 'validClientSecret';
const validRefreshToken = 'validRefreshToken';
const validMainToken = 'validMainToken';
const testPath = 'test';

// First we mock the API calls using axios MockAdapter

// Here the login sends the login response if the credentials are the "correct" one, 401 otherwise
axiosMock.onPost(baseUrl + loginPath).reply((config: AxiosRequestConfig) => {
    const body = JSON.parse(config.data);
    if(body.clientId === validClientId && body.clientSecret === validClientSecret) {
        return [
            200, 
            {
                mainToken: validMainToken,
                refreshToken: validRefreshToken
            }
        ]
    } else {
        return [401]
    }
});

// The refresh route sends the loginResponse if the token is "valid", 401 otherwise
axiosMock.onPost(baseUrl + refreshPath).reply(() => {
    if(AutoRefresh['refreshToken'] === validRefreshToken) {
        return [
            200, 
            {
                mainToken: validMainToken,
                refreshToken: validRefreshToken
            }
        ];
    } else {
        return [401];
    }
});

// We mock a route who represent any other route on the API
axiosMock.onPost(baseUrl + testPath).reply(() => {
    if(AutoRefresh['mainToken'] === validMainToken) {
        return [200, true];
    } else {
        return [401];
    }
});

// We "reset" the static class after each test
afterEach(() => {
    AutoRefresh['mainToken'] = '';
    AutoRefresh['refreshToken'] = '';
    AutoRefresh['instance'] = null;
})

// Test if the login method works and saves the credentials
test('Correct credentials allows login', async () => {
    await AutoRefresh.login(validClientId, validClientSecret);
    expect(AutoRefresh['mainToken']).toBe(validMainToken);
    expect(AutoRefresh['refreshToken']).toBe(validRefreshToken);
});

// Tests if the login method throws an error on incorrect credentials
test('Incorrect credentials throws an error', async () => {
    try{
        await AutoRefresh.login(validClientId, validClientSecret);
        await AutoRefresh.login('any', 'thing');
    }catch(e){
        expect(e.response.status).toBe(401);
    }
});

// Test if a 401 on a request triggers the redirect 
test('Failed requests redirect if unauthorized', async () => {
    try{
        await AutoRefresh.request('POST', testPath, {});
    } catch(e){
        expect(e.message).toBe('Redirect');
    }
})

// Test if we get the error on any other error 
test('Requests throw the normal error if it\'s not a 401', async () => {
    const test500Path = 'test500';
    axiosMock.onGet(baseUrl + test500Path).reply(500);
    try{
        await AutoRefresh.request('GET', test500Path);
    } catch(e){
        expect(e.response.status).toBe(500);
    }
})

// Test if a request works with auth
test('Using the login make the request work', async () => {
    await AutoRefresh.login(validClientId, validClientSecret);
    expect(await AutoRefresh.request('POST', testPath, {})).toBe(true);
    expect(AutoRefresh['mainToken']).toBe(validMainToken);
})

// Test if the route work and if the token is refreshed when the refreshToken is valid but not the mainToken
test('Refresh the token and make the call if the refreshToken is valid', async () => {
    await AutoRefresh.login(validClientId, validClientSecret);
    // Simulate the expiration by setting it directly
    AutoRefresh['mainToken'] = 'invalidMainToken';
    expect(await AutoRefresh.request('POST', testPath, {})).toBe(true);
    expect(AutoRefresh['mainToken']).toBe(validMainToken);
})

// Test if the route correctly throw an error if both token are invalid
test('Redirects the user if both token are invalid', async () => {
    await AutoRefresh.login(validClientId, validClientSecret);
    // Simulate the expiration by setting it directly
    AutoRefresh['mainToken'] = 'invalidMainToken';
    AutoRefresh['refreshToken'] = 'invalidRefreshToken';
    try{
        await AutoRefresh.request('POST', testPath, {});
    }catch(e){
        expect(e.message).toBe('Redirect');
    }
})