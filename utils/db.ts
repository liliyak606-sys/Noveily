
import { Comic, ComicPage } from '../types';

const DB_NAME = 'Noveily_DB';
const DB_VERSION = 1;
const STORE_COMICS = 'comics';
const STORE_PAGES = 'pages';

// Helper to open DB
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_COMICS)) {
        db.createObjectStore(STORE_COMICS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_PAGES)) {
        const pageStore = db.createObjectStore(STORE_PAGES, { keyPath: 'id' });
        pageStore.createIndex('comicId', 'comicId', { unique: false });
      }
    };
  });
};

export const saveComic = async (comic: Comic, pages: { id: string; comicId: string; blob: Blob; order: number }[]): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_COMICS, STORE_PAGES], 'readwrite');
    
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);

    const comicStore = transaction.objectStore(STORE_COMICS);
    const pageStore = transaction.objectStore(STORE_PAGES);

    comicStore.put(comic);
    pages.forEach(page => pageStore.put(page));
  });
};

export const getAllComics = async (): Promise<Comic[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_COMICS, 'readonly');
    const store = transaction.objectStore(STORE_COMICS);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result.sort((a, b) => b.createdAt - a.createdAt));
    request.onerror = () => reject(request.error);
  });
};

export const getComicPages = async (comicId: string): Promise<ComicPage[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_PAGES, 'readonly');
    const store = transaction.objectStore(STORE_PAGES);
    const index = store.index('comicId');
    const request = index.getAll(comicId);

    request.onsuccess = () => {
      const pages = request.result.sort((a, b) => a.order - b.order);
      resolve(pages.map(p => ({ id: p.id, blob: p.blob, order: p.order })));
    };
    request.onerror = () => reject(request.error);
  });
};

export const updateComicProgress = async (comicId: string, pageIndex: number): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_COMICS, 'readwrite');
        const store = transaction.objectStore(STORE_COMICS);
        const getRequest = store.get(comicId);

        getRequest.onsuccess = () => {
            const comic = getRequest.result;
            if (comic) {
                comic.lastReadPage = pageIndex;
                const putRequest = store.put(comic);
                putRequest.onsuccess = () => resolve();
                putRequest.onerror = () => reject(putRequest.error);
            } else {
                console.error("Comic not found for progress update:", comicId);
                resolve();
            }
        };
        getRequest.onerror = () => reject(getRequest.error);
    });
};

export const updateComicCover = async (comicId: string, coverBlob: Blob): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_COMICS, 'readwrite');
    const store = transaction.objectStore(STORE_COMICS);
    const getRequest = store.get(comicId);

    getRequest.onsuccess = () => {
      const comic = getRequest.result;
      if (comic) {
        comic.coverImageBlob = coverBlob;
        const putRequest = store.put(comic);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      } else {
        reject(new Error("Comic not found"));
      }
    };
    getRequest.onerror = () => reject(getRequest.error);
  });
};

export const deleteComic = async (comicId: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_COMICS, STORE_PAGES], 'readwrite');
    
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);

    const comicStore = transaction.objectStore(STORE_COMICS);
    const pageStore = transaction.objectStore(STORE_PAGES);
    const pageIndex = pageStore.index('comicId');

    comicStore.delete(comicId);

    const cursorRequest = pageIndex.openCursor(IDBKeyRange.only(comicId));
    
    cursorRequest.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
  });
};

export const deleteComicPage = async (pageId: string, comicId: string): Promise<void> => {
    const db = await openDB();
    return new Promise(async (resolve, reject) => {
        const transaction = db.transaction([STORE_PAGES, STORE_COMICS], 'readwrite');
        const pageStore = transaction.objectStore(STORE_PAGES);
        const comicStore = transaction.objectStore(STORE_COMICS);

        transaction.onerror = () => reject(transaction.error);
        transaction.oncomplete = () => resolve();

        pageStore.delete(pageId);

        const pageIndex = pageStore.index('comicId');
        const getAllPagesReq = pageIndex.getAll(comicId);

        getAllPagesReq.onsuccess = () => {
            const remainingPages = getAllPagesReq.result;

            if (remainingPages.length === 0) {
                comicStore.delete(comicId);
                return;
            }

            remainingPages.sort((a, b) => a.order - b.order);
            remainingPages.forEach((page, index) => {
                if (page.order !== index) {
                    page.order = index;
                    pageStore.put(page);
                }
            });

            const getComicReq = comicStore.get(comicId);
            getComicReq.onsuccess = () => {
                const comic = getComicReq.result;
                if (comic) {
                    comic.totalPages = remainingPages.length;
                    if (comic.lastReadPage >= comic.totalPages) {
                        comic.lastReadPage = Math.max(0, comic.totalPages - 1);
                    }
                    comicStore.put(comic);
                }
            };
        };
    });
};

export const updateComicTitle = async (comicId: string, newTitle: string): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_COMICS, 'readwrite');
        const store = transaction.objectStore(STORE_COMICS);
        const getRequest = store.get(comicId);

        getRequest.onsuccess = () => {
            const comic = getRequest.result;
            if (comic) {
                comic.title = newTitle;
                const putRequest = store.put(comic);
                putRequest.onsuccess = () => resolve();
                putRequest.onerror = () => reject(putRequest.error);
            } else {
                reject(new Error("Comic not found for title update"));
            }
        };
        getRequest.onerror = () => reject(getRequest.error);
    });
};
