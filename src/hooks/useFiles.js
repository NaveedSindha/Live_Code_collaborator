import { useState, useEffect } from "react";

const EXT_TO_LANG = {
  js: "javascript", jsx: "javascript", ts: "typescript", tsx: "typescript",
  py: "python", c: "c", cpp: "cpp", cc: "cpp", h: "c", hpp: "cpp",
  java: "java", go: "go", rs: "rust", rb: "ruby", php: "php",
  kt: "kotlin", sh: "bash", bash: "bash", html: "html", css: "css",
  json: "json", md: "markdown", yaml: "yaml", yml: "yaml",
  xml: "xml", sql: "sql", txt: "plaintext",
};

const LANG_ICONS = {
  javascript: "#f7df1e", typescript: "#3178c6", python: "#3572A5", c: "#555555",
  cpp: "#f34b7d", java: "#b07219", go: "#00ADD8", rust: "#dea584",
  ruby: "#701516", php: "#4F5D95", kotlin: "#A97BFF", bash: "#89e051",
  html: "#e34c26", css: "#563d7c", json: "#292929", markdown: "#083fa1",
  yaml: "#cb171e", xml: "#0060ac", sql: "#e38c00", plaintext: "#aaaaaa",
};

const FILE_ICONS = {
  js: "JS", jsx: "JSX", ts: "TS", tsx: "TSX", py: "PY", c: "C",
  cpp: "C+", java: "☕", go: "GO", rs: "RS", rb: "RB", php: "PHP",
  kt: "KT", sh: "SH", html: "HT", css: "CS", json: "{}",
  md: "MD", yaml: "YL", yml: "YL", xml: "XML", sql: "SQL", txt: "TX",
};

const DEFAULT_CONTENT = {
  javascript: "// Start coding...\nconsole.log('Hello, World!');\n",
  typescript: "// TypeScript\nconst greet = (name: string): string => `Hello, ${name}!`;\nconsole.log(greet('World'));\n",
  python: "# Start coding...\nprint('Hello, World!')\n",
  html: "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"UTF-8\">\n  <title>Document</title>\n</head>\n<body>\n  <h1>Hello, World!</h1>\n</body>\n</html>\n",
  css: "/* Styles */\nbody {\n  font-family: sans-serif;\n  margin: 0;\n  padding: 20px;\n}\n",
  json: '{\n  "name": "project",\n  "version": "1.0.0"\n}\n',
  markdown: "# Title\n\nStart writing...\n",
};

export function getExtension(filename) {
  return filename.split(".").pop().toLowerCase();
}

export function getLangFromFile(filename) {
  return EXT_TO_LANG[getExtension(filename)] || "plaintext";
}

export function getIconLabel(filename) {
  return FILE_ICONS[getExtension(filename)] || "  ";
}

export function getLangColor(lang) {
  return LANG_ICONS[lang] || "#888";
}

export function getDefaultContent(filename) {
  const lang = getLangFromFile(filename);
  return DEFAULT_CONTENT[lang] || `// ${filename}\n`;
}

function genId() {
  return "f" + Math.random().toString(36).slice(2, 8);
}

export function useFiles({ roomId, username, socketRef, showToast, fileInputRef }) {
  const [files, setFiles] = useState([
    { id: "f1", name: "index.js", type: "file", parentId: null, content: DEFAULT_CONTENT.javascript, unsaved: false },
  ]);
  const [activeFileId, setActiveFileId] = useState("f1");
  const [openTabs, setOpenTabs] = useState(["f1"]);
  const [renamingFileId, setRenamingFileId] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [creatingFile, setCreatingFile] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFileInFolder, setCreatingFileInFolder] = useState(null);
  const [newFileInFolderName, setNewFileInFolderName] = useState("");
  const [collapsedFolders, setCollapsedFolders] = useState({});
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const q = searchQuery.toLowerCase();
    const results = [];
    files.forEach(file => {
      if (file.type === "folder") return;
      (file.content || "").split("\n").forEach((line, idx) => {
        if (line.toLowerCase().includes(q)) {
          results.push({ fileId: file.id, fileName: file.name, lineNum: idx + 1, line });
        }
      });
    });
    setSearchResults(results.slice(0, 50));
  }, [searchQuery, files]);

  function openFile(fileId) {
    setActiveFileId(fileId);
    setOpenTabs(prev => prev.includes(fileId) ? prev : [...prev, fileId]);
  }

  function closeTab(fileId, e) {
    e?.stopPropagation();
    const idx = openTabs.indexOf(fileId);
    const newTabs = openTabs.filter(id => id !== fileId);
    setOpenTabs(newTabs);
    if (activeFileId === fileId) {
      setActiveFileId(newTabs.length > 0 ? (newTabs[Math.max(0, idx - 1)] || newTabs[0]) : null);
    }
  }

  function updateFileContent(fileId, content) {
    setFiles(prev => prev.map(f => f.id === fileId ? { ...f, content, unsaved: true } : f));
  }

  function createNewFile(name, parentId = null) {
    if (!name?.trim()) return;
    const trimmed = name.trim();
    const finalName = trimmed.includes(".") ? trimmed : trimmed + ".js";
    if (files.some(f => f.name === finalName && f.parentId === parentId)) { showToast("File already exists"); return; }
    const id = genId();
    const newFile = { id, name: finalName, type: "file", parentId, content: getDefaultContent(finalName), unsaved: false };
    setFiles(prev => [...prev, newFile]);
    openFile(id);
    socketRef.current?.emit("file-created", { roomId, file: newFile, username });
    showToast(`Created ${finalName}`);
  }

  function createNewFolder(name, parentId = null) {
    if (!name?.trim()) return;
    const trimmed = name.trim();
    if (files.some(f => f.name === trimmed && f.type === "folder" && f.parentId === parentId)) { showToast("Folder already exists"); return; }
    const id = genId();
    const newFolder = { id, name: trimmed, type: "folder", parentId, content: "", unsaved: false };
    setFiles(prev => [...prev, newFolder]);
    socketRef.current?.emit("file-created", { roomId, file: newFolder, username });
    showToast(`Created folder: ${trimmed}`);
  }

  function createNewFileInFolder(name, parentId) {
    if (!name?.trim()) return;
    const trimmed = name.trim();
    const finalName = trimmed.includes(".") ? trimmed : trimmed + ".js";
    if (files.some(f => f.name === finalName && f.parentId === parentId)) { showToast("File already exists in this folder"); return; }
    const id = genId();
    const newFile = { id, name: finalName, type: "file", parentId, content: getDefaultContent(finalName), unsaved: false };
    setFiles(prev => [...prev, newFile]);
    openFile(id);
    socketRef.current?.emit("file-created", { roomId, file: newFile, username });
    showToast(`Created ${finalName}`);
  }

  function toggleFolder(folderId) {
    setCollapsedFolders(prev => ({ ...prev, [folderId]: !prev[folderId] }));
  }

  function deleteFolder(folderId) {
    function collectDescendants(parentId) {
      const children = files.filter(f => f.parentId === parentId);
      let ids = [parentId];
      children.forEach(child => {
        ids = ids.concat(child.type === "folder" ? collectDescendants(child.id) : [child.id]);
      });
      return ids;
    }
    const toDelete = collectDescendants(folderId);
    toDelete.forEach(id => { socketRef.current?.emit("file-deleted", { roomId, fileId: id, username }); closeTab(id); });
    setFiles(prev => prev.filter(f => !toDelete.includes(f.id)));
    showToast("Folder deleted");
  }

  function deleteFile(fileId) {
    const file = files.find(f => f.id === fileId);
    setFiles(prev => prev.filter(f => f.id !== fileId));
    closeTab(fileId);
    socketRef.current?.emit("file-deleted", { roomId, fileId, username });
    showToast(`Deleted ${file?.name}`);
  }

  function renameFile(fileId, newName) {
    if (!newName?.trim()) return;
    setFiles(prev => prev.map(f => f.id === fileId ? { ...f, name: newName.trim() } : f));
    socketRef.current?.emit("file-renamed", { roomId, fileId, name: newName.trim(), username });
  }

  function downloadFile(file) {
    const blob = new Blob([file.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = file.name;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
    showToast(`Downloaded ${file.name}`);
  }

  function readFileContent(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = reject;
      const ext = getExtension(file.name);
      const textExtensions = ['js','jsx','ts','tsx','py','c','cpp','cc','h','hpp','java','go','rs','rb','php','kt','sh','bash','html','css','json','md','yaml','yml','xml','sql','txt','csv','toml','ini','env','gitignore','lock'];
      const textFilenames = ['makefile','dockerfile','vagrantfile','gemfile','rakefile','procfile','license','readme','changelog','authors','contributors','.gitignore','.env','.editorconfig'];
      const isText = textFilenames.includes(file.name.toLowerCase()) || textExtensions.includes(ext) || ext === file.name.toLowerCase();
      if (isText) { reader.readAsText(file); }
      else if (file.size > 1024 * 1024) { reject(new Error('Binary files larger than 1MB not supported')); }
      else { reader.readAsDataURL(file); showToast(`Note: ${file.name} is binary, read as base64.`); }
    });
  }

  async function processUploadedFiles(filesArray) {
    if (!filesArray.length) return;
    setUploadingFiles(true);
    setUploadProgress({ current: 0, total: filesArray.length });
    const currentFiles = [...files];
    const folderPathToId = {};

    function ensureFolderPath(parts) {
      let parentId = null;
      let builtPath = "";
      for (const part of parts) {
        builtPath = builtPath ? `${builtPath}/${part}` : part;
        if (!folderPathToId[builtPath]) {
          const existing = currentFiles.find(f => f.type === "folder" && f.name === part && f.parentId === parentId);
          if (existing) {
            folderPathToId[builtPath] = existing.id;
          } else {
            const folderId = genId();
            folderPathToId[builtPath] = folderId;
            const folderNode = { id: folderId, name: part, type: "folder", parentId, content: "", unsaved: false };
            currentFiles.push(folderNode);
            setFiles(prev => [...prev, folderNode]);
            socketRef.current?.emit("file-created", { roomId, file: folderNode, username });
          }
        }
        parentId = folderPathToId[builtPath];
      }
      return parentId;
    }

    for (let i = 0; i < filesArray.length; i++) {
      const file = filesArray[i];
      try {
        const content = await readFileContent(file);
        let parentId = null;
        const relativePath = file.webkitRelativePath || "";
        if (relativePath && relativePath.includes("/")) {
          parentId = ensureFolderPath(relativePath.split("/").slice(0, -1));
        }
        const existingFile = currentFiles.find(f => f.name === file.name && f.parentId === parentId && f.type === "file");
        if (existingFile) {
          if (window.confirm(`${file.name} already exists. Overwrite?`)) {
            updateFileContent(existingFile.id, content);
            socketRef.current?.emit("code-change", { roomId, fileId: existingFile.id, code: content, username });
            showToast(`Overwrote ${file.name}`);
          }
        } else {
          const id = genId();
          const newFile = { id, name: file.name, type: "file", parentId, content, unsaved: false };
          currentFiles.push(newFile);
          setFiles(prev => [...prev, newFile]);
          socketRef.current?.emit("file-created", { roomId, file: newFile, username });
          showToast(`Uploaded ${file.name}`);
        }
      } catch (err) {
        showToast(`Failed to upload ${file.name}`);
      }
      setUploadProgress({ current: i + 1, total: filesArray.length });
    }
    setUploadingFiles(false);
    setUploadProgress({ current: 0, total: 0 });
    if (fileInputRef?.current) fileInputRef.current.value = "";
  }

  function handleFileUpload(e) {
    processUploadedFiles(Array.from(e.target.files));
  }

  function handleFolderUpload(e) {
    const valid = Array.from(e.target.files).filter(f => {
      const ext = getExtension(f.name);
      return ext && !['exe','dll','so','dylib','bin'].includes(ext);
    });
    processUploadedFiles(valid);
  }

  function handleDragOver(e) { e.preventDefault(); e.stopPropagation(); setDragActive(true); }
  function handleDragLeave(e) { e.preventDefault(); e.stopPropagation(); setDragActive(false); }
  function handleDrop(e) {
    e.preventDefault(); e.stopPropagation(); setDragActive(false);
    processUploadedFiles(Array.from(e.dataTransfer.files));
  }

  return {
    files, setFiles,
    activeFileId, setActiveFileId,
    openTabs, setOpenTabs,
    renamingFileId, setRenamingFileId,
    renameValue, setRenameValue,
    creatingFile, setCreatingFile,
    newFileName, setNewFileName,
    creatingFolder, setCreatingFolder,
    newFolderName, setNewFolderName,
    creatingFileInFolder, setCreatingFileInFolder,
    newFileInFolderName, setNewFileInFolderName,
    collapsedFolders,
    uploadingFiles,
    dragActive,
    uploadProgress,
    searchQuery, setSearchQuery,
    searchResults,
    openFile, closeTab, updateFileContent,
    createNewFile, createNewFolder, createNewFileInFolder,
    deleteFile, deleteFolder, renameFile,
    toggleFolder, downloadFile, processUploadedFiles,
    handleFileUpload, handleFolderUpload,
    handleDragOver, handleDragLeave, handleDrop,
  };
}