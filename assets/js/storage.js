/**
 * Bezpieczny dostęp do localStorage.
 * Gdy przeglądarka blokuje pamięć (tryb prywatny, blokada danych witryn),
 * wartości trzymane są tymczasowo w pamięci, a skrypty się nie wywracają.
 * Ładować PRZED pozostałymi skryptami.
 */
(function () {
    'use strict';

    const memory = {};

    window.store = {
        get(key, fallback = null) {
            try {
                const value = window.localStorage.getItem(key);
                return value === null ? fallback : value;
            } catch (e) {
                return Object.prototype.hasOwnProperty.call(memory, key) ? memory[key] : fallback;
            }
        },
        set(key, value) {
            try {
                window.localStorage.setItem(key, String(value));
            } catch (e) {
                memory[key] = String(value);
            }
        },
        remove(key) {
            try {
                window.localStorage.removeItem(key);
            } catch (e) {
                delete memory[key];
            }
        }
    };
})();
