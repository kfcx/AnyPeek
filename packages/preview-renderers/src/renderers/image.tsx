import { useEffect, useMemo, useState } from 'react';

import Lightbox from 'yet-another-react-lightbox';
import Inline from 'yet-another-react-lightbox/plugins/inline';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import 'yet-another-react-lightbox/styles.css';

import { ErrorCard, LoadingCard } from '../common';
import type { RendererProps } from '../types';
import { usePreviewObjectUrl } from '../use-preview-object-url';

interface ImageState {
  loading: boolean;
  width: number;
  height: number;
  error: string | null;
}

export function ImageRenderer({ resource }: RendererProps) {
  const { previewUrl, loading: loadingBlob, error: blobError } = usePreviewObjectUrl(resource);
  const [state, setState] = useState<ImageState>({
    loading: true,
    width: 1,
    height: 1,
    error: null
  });

  useEffect(() => {
    if (!previewUrl) {
      return;
    }

    let active = true;
    const image = new Image();
    image.referrerPolicy = 'no-referrer';

    setState({
      loading: true,
      width: 1,
      height: 1,
      error: null
    });

    image.onload = () => {
      if (!active) {
        return;
      }

      setState({
        loading: false,
        width: Math.max(image.naturalWidth, 1),
        height: Math.max(image.naturalHeight, 1),
        error: null
      });
    };

    image.onerror = () => {
      if (!active) {
        return;
      }

      setState({
        loading: false,
        width: 1,
        height: 1,
        error: '图片加载失败。'
      });
    };

    image.src = previewUrl;

    return () => {
      active = false;
      image.onload = null;
      image.onerror = null;
    };
  }, [previewUrl, resource.id]);

  const slides = useMemo(
    () => [
        {
          src: previewUrl,
          alt: resource.fileName,
          width: state.width,
          height: state.height
        }
      ],
    [previewUrl, resource.fileName, state.height, state.width]
  );

  if (loadingBlob || state.loading) {
    return <LoadingCard>正在读取图片尺寸并初始化交互式预览器。</LoadingCard>;
  }

  if (blobError || state.error || !previewUrl) {
    return <ErrorCard message={blobError || state.error || '图片加载失败。'} />;
  }

  return (
    <div className="image-lightbox-shell">
      <Lightbox
        carousel={{ finite: true }}
        controller={{ closeOnBackdropClick: false, closeOnPullDown: false }}
        inline={{
          style: {
            width: '100%',
            height: '100%'
          }
        }}
        plugins={[Inline, Zoom]}
        render={{
          buttonNext: () => null,
          buttonPrev: () => null
        }}
        slides={slides}
      />
    </div>
  );
}
