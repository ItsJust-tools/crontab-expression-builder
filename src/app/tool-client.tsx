'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ToolShell, useTool, ImportExport } from '@itsjust/core';
import { compressToEncodedURIComponent } from 'lz-string';
import {
  toolConfig,
  templateBaseVersion,
  ToolCanvas,
  ToolToolbar,
  ToolSidebar,
  cronTool,
  stateFromLocation,
} from '@/tool';
import type { CronState } from '@/tool/types';

export default function ToolClient() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const tool = useTool<CronState>(cronTool, canvasRef);
  const data = tool.state.data;
  const setToolData = tool.state.setData;
  const showToast = tool.toast;
  const [isSharing, setIsSharing] = useState(false);
  const hasLoadedSharedState = useRef(false);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(
    () => typeof window !== 'undefined' && window.innerWidth > 768 && toolConfig.features.sidebar
  );

  useEffect(() => {
    document.title = toolConfig.name;
  }, []);

  /* ------------------------------ shared state ------------------------------ */

  useEffect(() => {
    if (hasLoadedSharedState.current) return;
    hasLoadedSharedState.current = true;
    const shared = stateFromLocation();
    if (!shared) return;
    setToolData(shared);
    showToast('Loaded expression from share link', 'success');
  }, [setToolData, showToast]);

  const handleShare = useCallback(async () => {
    setIsSharing(true);
    try {
      const encoded = cronTool.serialize(tool.state.data);
      const url = new URL(window.location.href);
      url.searchParams.set('state', compressToEncodedURIComponent(encoded));
      url.searchParams.set('tool', toolConfig.id);
      window.history.replaceState(null, '', url.toString());

      const shareUrl = url.toString();
      if (navigator.share) {
        try {
          await navigator.share({ title: toolConfig.name, url: shareUrl });
          showToast('Shared URL ready', 'success');
          return;
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') return;
        }
      }
      await navigator.clipboard.writeText(shareUrl);
      showToast('Share URL copied to clipboard', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create share URL';
      showToast(message, 'error');
    } finally {
      setIsSharing(false);
    }
  }, [showToast, tool.state.data]);

  /* -------------------------------- rendering ------------------------------- */

  const toolbarActions = useMemo(() => ({ ...tool.toolbarActions }), [tool.toolbarActions]);

  const toolbarContent = (
    <>
      <ToolToolbar state={data} onChange={setToolData as (s: CronState) => void} />
      <ImportExport
        formats={tool.supportedFormats}
        onExport={tool.handleExport}
        onImport={tool.importFromFile}
        isImporting={tool.isImporting}
        onShare={handleShare}
        isSharing={isSharing}
      />
    </>
  );

  const sidebarContent = <ToolSidebar state={data} />;

  const canvasContent = (
    <ToolCanvas
      canvasRef={canvasRef}
      state={data}
      onChange={setToolData as (s: CronState) => void}
    />
  );

  const statusBarContent = (
    <>
      <span
        className={`status-slot status-slot-state ${tool.state.isDirty ? 'status-unsaved' : 'status-saved'}`}
      >
        {tool.state.isDirty ? (
          <>
            <span className="status-saving-dot" />
            Unsaved
          </>
        ) : tool.state.lastSaved ? (
          <>Saved {tool.state.lastSaved}</>
        ) : (
          'Ready'
        )}
      </span>
      <span className="status-slot status-slot-title">
        {data.useSeconds ? '6-field (with seconds)' : '5-field'}
      </span>
      <span className="status-slot status-slot-tool-version">Tool v{toolConfig.version}</span>
      <span className="status-slot status-slot-template-version">
        Template v{templateBaseVersion}
      </span>
    </>
  );

  return (
    <ToolShell
      config={toolConfig}
      actions={toolbarActions}
      sidebarOpen={sidebarOpen}
      onSidebarChange={setSidebarOpen}
      toolbar={toolbarContent}
      sidebar={sidebarContent}
      canvas={canvasContent}
      statusBar={statusBarContent}
    />
  );
}
