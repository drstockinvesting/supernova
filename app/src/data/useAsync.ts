import { useEffect, useState } from 'react'

export type AsyncState<T> =
  | { status: 'loading'; value?: undefined; error?: undefined }
  | { status: 'ready'; value: T; error?: undefined }
  | { status: 'error'; value?: undefined; error: Error }

/**
 * Runs an async loader and tracks its state, discarding results from a load that
 * has been superseded — navigating between students fires overlapping fetches, and
 * without the guard a slow earlier request can overwrite a faster later one.
 *
 * `deps` is the identity of the request, not of the function.
 */
export function useAsync<T>(loader: () => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ status: 'loading' })

  useEffect(() => {
    let current = true
    setState({ status: 'loading' })

    loader().then(
      (value) => {
        if (current) setState({ status: 'ready', value })
      },
      (error: unknown) => {
        if (current) {
          setState({
            status: 'error',
            error: error instanceof Error ? error : new Error(String(error)),
          })
        }
      },
    )

    return () => {
      current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return state
}
