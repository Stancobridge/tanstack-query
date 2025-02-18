import type { QueryKey, UseQueryOptions } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useEnvironmentVariables, useQueryConfig } from '../config';
import type { IRequestError, IRequestSuccess } from '../request';
import { HttpMethod, makeRequest } from '../request';
import { useHeaderStore, usePauseFutureRequests } from '../stores';
import type { DefaultRequestOptions } from './queries.interface';

export const useDeleteRequest = <TResponse>(deleteOptions?: DefaultRequestOptions) => {
  const { baseUrl, headers } = deleteOptions ?? {};
  const [requestPath, setRequestPath] = useState<string>('');
  const [options, setOptions] = useState<any>();

  const { options: queryConfigOptions } = useQueryConfig();
  const [requestPayload, setRequestPayload] = useState<Record<any, any>>();

  const isFutureQueriesPaused = usePauseFutureRequests((state) => state.isFutureQueriesPaused);

  const { API_URL, TIMEOUT } = useEnvironmentVariables();

  const globalHeaders = useHeaderStore((state) => state.headers);

  const sendRequest = async (res: (value: any) => void, rej: (reason?: any) => void, queryKey: QueryKey) => {
    const [url] = queryKey;
    const requestUrl = (url ?? requestPath) as string;

    const requestOptions = {
      path: requestUrl,
      headers: { ...globalHeaders, ...headers },
      baseURL: baseUrl ?? API_URL,
      method: HttpMethod.DELETE,
      timeout: TIMEOUT,
    };

    let shouldContinue = true;

    if (queryConfigOptions?.queryMiddleware) {
      shouldContinue = await queryConfigOptions.queryMiddleware({ queryKey, ...requestOptions });
    }

    if (shouldContinue) {
      const postResponse = await makeRequest<TResponse>(requestOptions);

      if (postResponse.status) {
        res(postResponse as IRequestSuccess<TResponse>);
      } else {
        rej(postResponse);
      }
    } else {
      rej(null);
    }
  };

  const query = useQuery<any, any, IRequestSuccess<TResponse>>({
    queryKey: [requestPath, {}],
    queryFn: ({ queryKey }) =>
      new Promise<IRequestSuccess<TResponse> | IRequestError>((res, rej) => sendRequest(res, rej, queryKey)),
    enabled: false,
    ...options,
  });

  const updatedPathAsync = async (link: string) => {
    return setRequestPath(link);
  };

  const setOptionsAsync = async (fetchOptions: any) => {
    return setOptions(fetchOptions);
  };

  const destroy = async (
    link: string,
    internalDeleteOptions?: UseQueryOptions<
      IRequestSuccess<TResponse | undefined>,
      IRequestError,
      IRequestSuccess<TResponse | undefined>,
      Array<any>
    > & { cached?: boolean }
  ): Promise<IRequestSuccess<TResponse> | undefined> => {
    if (!isFutureQueriesPaused) {
      // set enabled to be true for every delete
      internalDeleteOptions = internalDeleteOptions
        ? { ...internalDeleteOptions, queryKey: [link, {}], enabled: true }
        : { queryKey: [link, {}], enabled: true };

      await setOptionsAsync(internalDeleteOptions);
      await updatedPathAsync(link);

      return query.data;
    } else {
      setRequestPayload({ link, internalDeleteOptions });
      return undefined;
    }
  };

  useEffect(() => {
    if (!isFutureQueriesPaused && requestPayload) {
      destroy(requestPayload.link, requestPayload.internalDeleteOptions);
      setRequestPayload(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFutureQueriesPaused]);

  return { destroy, ...query, isLoading: query.isLoading || isFutureQueriesPaused };
};
