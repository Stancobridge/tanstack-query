import type { UseQueryOptions } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import type { RawAxiosRequestHeaders } from 'axios';
import { useState } from 'react';
import { useEnvironmentVariables, useQueryHeaders } from '../config';
import type { IRequestError, IRequestSuccess } from '../request';
import { HttpMethod, makeRequest } from '../request';

export const useDeleteRequest = <TResponse>() => {
  const [requestPath, updateDeletePath] = useState<string>('');
  const [options, setOptions] = useState<any>();

  const { API_URL, TIMEOUT } = useEnvironmentVariables();

  const { getHeaders } = useQueryHeaders();

  const query = useQuery<any, any, IRequestSuccess<TResponse>>(
    [requestPath, {}],
    () =>
      new Promise<IRequestSuccess<TResponse> | IRequestError>((res, rej) => {
        setTimeout(async () => {
          // get request headers
          const headers: RawAxiosRequestHeaders = getHeaders();

          const postResponse = await makeRequest<TResponse>({
            path: requestPath,
            headers,
            method: HttpMethod.DELETE,
            baseURL: API_URL,
            timeout: TIMEOUT,
          });
          if (postResponse.status) {
            res(postResponse as IRequestSuccess<TResponse>);
          } else {
            rej(postResponse);
          }
        }, 200);
      }),
    { enabled: false, ...options }
  );

  const updatedPathAsync = async (link: string) => {
    return updateDeletePath(link);
  };

  const setOptionsAsync = async (fetchOptions: any) => {
    return setOptions(fetchOptions);
  };

  const destroy = async (
    link: string,
    deleteOptions?: UseQueryOptions<
      IRequestSuccess<TResponse | undefined>,
      IRequestError,
      IRequestSuccess<TResponse | undefined>,
      Array<any>
    >
  ): Promise<IRequestSuccess<TResponse> | undefined> => {
    // set enabled to be true for every delete
    deleteOptions = deleteOptions ?? {};
    deleteOptions.enabled = true;

    await updatedPathAsync(link);
    await setOptionsAsync(deleteOptions);

    return query.data;
  };

  return { destroy, ...query };
};
