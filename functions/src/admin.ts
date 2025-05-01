import * as admin from "firebase-admin";
import { getApp } from "firebase-functions/lib/common/app";

if (getApp().length === 0) {
    admin.initializeApp();
}

export { admin };
