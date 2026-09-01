import axios, { AxiosInstance, AxiosError } from "axios";
import type {
  OpsChurchDetail,
  OpsChurchListResponse,
  OpsOverview,
} from "@/types/opsChurches";
import type { OpsHealthResponse } from "@/types/opsHealth";
import type { OpsWaitlistListItem, OpsWaitlistListResponse } from "@/types/opsWaitlist";
import type { OpsChurchListQuery } from "@/lib/opsChurchQuery";
import { toChurchListApiParams } from "@/lib/opsChurchQuery";
import type { OpsWaitlistListQuery } from "@/lib/opsWaitlistQuery";
import { toWaitlistListApiParams } from "@/lib/opsWaitlistQuery";

export interface OperatorUser {
  id: string;
  email: string;
}

export interface OpsLoginResponse {
  message: string;
  id: string;
  email: string;
}

type ApiErrorBody = {
  error?: string;
  details?: string | string[];
};

function enhanceAxiosError(error: AxiosError<ApiErrorBody>): Error {
  const data = error.response?.data;
  const message =
    (data && typeof data === "object" && data.error) ||
    error.message ||
    "Erro inesperado";
  const enhanced = new Error(message) as Error & {
    status?: number;
    details?: string | string[];
  };
  enhanced.status = error.response?.status;
  enhanced.details = data?.details;
  return enhanced;
}

class OpsApiService {
  private api: AxiosInstance;

  constructor() {
    const baseURL =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

    this.api = axios.create({
      baseURL,
      timeout: 10000,
      withCredentials: true,
      headers: {
        "Content-Type": "application/json",
      },
    });

    this.api.interceptors.response.use(
      (response) => response,
      (error: AxiosError<ApiErrorBody>) => {
        const url = error.config?.url || "";
        const isLogin = url.includes("/ops/login");
        const isMe = url.includes("/ops/me");
        const isAlreadyOnLogin =
          typeof window !== "undefined" && window.location.pathname === "/login";

        if (
          error.response?.status === 401 &&
          !isLogin &&
          !isMe &&
          !isAlreadyOnLogin &&
          typeof window !== "undefined"
        ) {
          window.location.href = "/login";
        }

        return Promise.reject(enhanceAxiosError(error));
      }
    );
  }

  async login(email: string, password: string): Promise<OpsLoginResponse> {
    const response = await this.api.post<OpsLoginResponse>("/ops/login", {
      email,
      password,
    });
    return response.data;
  }

  async logout(): Promise<void> {
    try {
      await this.api.post("/ops/logout");
    } catch (error) {
      console.warn(
        "[Admin OPS] Falha ao comunicar logout ao servidor. Cookies podem permanecer até expirar.",
        error
      );
    }
  }

  async getMe(): Promise<OperatorUser | null> {
    try {
      const response = await this.api.get<OperatorUser>("/ops/me");
      return response.data;
    } catch (error) {
      const status = (error as Error & { status?: number }).status;
      if (status === 401 || status === 403) {
        return null;
      }
      throw error;
    }
  }

  async getOverview(): Promise<OpsOverview> {
    const response = await this.api.get<OpsOverview>("/ops/overview");
    return response.data;
  }

  async listChurches(
    query: OpsChurchListQuery
  ): Promise<OpsChurchListResponse> {
    const response = await this.api.get<OpsChurchListResponse>(
      "/ops/churches",
      { params: toChurchListApiParams(query) }
    );
    return response.data;
  }

  async getChurch(id: string): Promise<OpsChurchDetail> {
    const response = await this.api.get<OpsChurchDetail>(
      `/ops/churches/${id}`
    );
    return response.data;
  }

  async getHealth(): Promise<OpsHealthResponse> {
    const response = await this.api.get<OpsHealthResponse>("/ops/health");
    return response.data;
  }

  async listWaitlist(
    query: OpsWaitlistListQuery
  ): Promise<OpsWaitlistListResponse> {
    const response = await this.api.get<OpsWaitlistListResponse>(
      "/ops/waitlist",
      { params: toWaitlistListApiParams(query) }
    );
    return response.data;
  }

  async patchWaitlist(
    id: string,
    status: "converted" | "discarded"
  ): Promise<OpsWaitlistListItem> {
    const response = await this.api.patch<OpsWaitlistListItem>(
      `/ops/waitlist/${id}`,
      { status }
    );
    return response.data;
  }
}

export const opsApi = new OpsApiService();
export default opsApi;
