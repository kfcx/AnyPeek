import { useEffect, useState } from 'react';

import { toArrayBuffer, type ResolvedPreviewResource } from '@preview/core';

interface PreviewObjectUrlState {
  previewUrl: string;
  loading: boolean;
  error: string | null;
}

export function usePreviewObjectUrl(resource: ResolvedPreviewResource): PreviewObjectUrlState {
  const [state, setState] = useState<PreviewObjectUrlState>({
    previewUrl: resource.previewUrl,
    loading: !resource.previewUrl,
    error: null
  });

  useEffect(() => {
    if (resource.previewUrl) {
      setState({
        previewUrl: resource.previewUrl,
        loading: false,
        error: null
      });
      return;
    }

    let active = true;
    let objectUrl = '';

    setState({
      previewUrl: '',
      loading: true,
      error: null
    });

    void resource.handle
      .readAll()
      .then((bytes) => {
        if (!active) {
          return;
        }

        objectUrl = URL.createObjectURL(
          new Blob([toArrayBuffer(bytes)], { type: resource.contentType || 'application/octet-stream' })
        );
        setState({
          previewUrl: objectUrl,
          loading: false,
          error: null
        });
      })
      .catch((previewError: unknown) => {
        if (!active) {
          return;
        }

        setState({
          previewUrl: '',
          loading: false,
          error: previewError instanceof Error ? previewError.message : '资源加载失败。'
        });
      });

    return () => {
      active = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [resource]);

  return state;
}
