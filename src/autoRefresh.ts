import Axios, { AxiosError, AxiosInstance, AxiosResponse, InternalAxiosRequestConfig, Method } from 'axios';

import { LoginResponse } from './models/login.response';

/**
 * A static class used to make requests to a server without handling the auth once the login has been made 
 */
export class AutoRefresh {
    private static readonly baseUrl: string = "http://baseUrl.com/";
    private static readonly refreshPath: string = "refresh";
    private static readonly loginPath: string = "login";
    private static mainToken: string;
    private static refreshToken: string;
    private static instance: AxiosInstance;

    /**
     * Requests the desired route and automatically handles the auth token's refresh if possible.
     * It creates the axios instance if needed, and delegate the request to it.
     * @param url - The requested route's path on the server
     * @param method 
     * @param data - Optional, an object to send as the body of the request
     * @returns the body of the response
     */
    public static async request<T>(method: Method, url: string, data: unknown = null): Promise<T> {
        if (! this.instance) {
            this.createInstance();
        }
        return (await this.instance.request<T>({
            method,
            url,
            data,
        })).data;
    }

    /**
     * Used to log the client in, saving the tokens for future requests
     * It creates the axios instance if needed, make the request, and update the instance if it's successfull.
     * @param clientId 
     * @param clientSecret 
     */
    public static async login(clientId: string, clientSecret: string): Promise<void> {
        if (! this.instance) {
            this.createInstance();
        }

        // We use the default Axios instance, we don't need our interceptor on this request
        const response: AxiosResponse<LoginResponse> = await Axios.post<LoginResponse>(
            this.baseUrl + this.loginPath,
            {
                clientId,
                clientSecret
            }  
        );
        this.updateAuth(response.data);
    }

    /**
     * Creates the axios instance that will handles the requests and its interceptor
     */
    private static createInstance(): void { 
        this.instance = Axios.create({
            baseURL: this.baseUrl,
            validateStatus: (status: number) => {
                return status >= 200 && status < 300;
            }
        });
        this.instance.interceptors.response.use(
            (response: AxiosResponse) => {
                return response;
            },
            async (error: AxiosError) => {
                return this.handleAxiosErrors(error);
            }
        );
    }

    /**
     * The axios interceptor that will refresh the access token and retry the request if possible
     * @param error - The error thrown by an axios request
     * @returns the original request's result with the auth fixed if possible
     */
    private static async handleAxiosErrors(error: AxiosError): Promise<AxiosResponse> {
        // If it's not a 401, the error is not relevant to this interceptor
        if(!error.response || error.response.status !== 401) {
            throw error;
        }

        // We recover the failed request's configuration
        const originalRequest: InternalAxiosRequestConfig = error.config;

        // If we don't have any refresh token, the interceptor simply redirect to the login
        if(! this.refreshToken) {
            this.disconnectAndRedirect(error);
        }

        try{
            // The request failed with a 401 and we have a refresh token, we refresh the token and update the instance
            // We use the default Axios instance to bypass this interceptor (and a possible infinite loop) on subsequent request  
            const response: AxiosResponse<LoginResponse> = await Axios.post<LoginResponse>(
                this.baseUrl + this.refreshPath,
                {
                    refreshToken: this.refreshToken
                }
            );
            this.updateAuth(response.data);

            // Then we update the failed request with the new token and retry it
            originalRequest.headers.Authorization = response.data.mainToken;
            return Axios.request(originalRequest);
        } catch(e) {
            // The refresh request failed, we redirect the user to the login 
            this.disconnectAndRedirect(error);
        }
    }

    /**
     * Simply uses the login/refresh response to update the axios instance
     * @param loginResponse 
     */
    private static updateAuth(loginResponse: LoginResponse): void {
        this.refreshToken = loginResponse.refreshToken;
        this.mainToken = loginResponse.mainToken;
        this.instance.defaults.headers.common['Authorization'] = this.mainToken;
    }

    /**
     * Disconnect and redirect the user to the login page
     * @param error 
     */
    private static disconnectAndRedirect(error: AxiosError): void {
        this.refreshToken = '';
        this.mainToken = '';
        // If needed, we can redirect the user from here
        // window.location.replace("siteUrl/Login");
        // For simplicity here, i just edit the error message to "Redirect", but we could create a custom error 
        error.message = 'Redirect';
        throw error;
    }

}