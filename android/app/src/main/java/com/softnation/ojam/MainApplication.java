package com.softnation.ojam;

import android.app.Application;
import android.content.res.Configuration;

import com.facebook.react.PackageList;
import com.facebook.react.ReactApplication;
import com.facebook.react.ReactHost;
import com.facebook.react.ReactNativeApplicationEntryPoint;
import com.facebook.react.ReactNativeHost;
import com.facebook.react.ReactPackage;
import com.facebook.react.defaults.DefaultReactNativeHost;

import java.util.List;

import expo.modules.ApplicationLifecycleDispatcher;
import expo.modules.ReactNativeHostWrapper;

public class MainApplication extends Application implements ReactApplication {

  private final ReactNativeHost reactNativeHost = new ReactNativeHostWrapper(
      this,
      new DefaultReactNativeHost(this) {
        @Override
        public List<ReactPackage> getPackages() {
          return new PackageList(this).getPackages();
        }

        @Override
        protected String getJSMainModuleName() {
          return ".expo/.virtual-metro-entry";
        }

        @Override
        public boolean getUseDeveloperSupport() {
          return BuildConfig.DEBUG;
        }

        @Override
        public boolean isNewArchEnabled() {
          return BuildConfig.IS_NEW_ARCHITECTURE_ENABLED;
        }
      }
  );

  @Override
  public ReactNativeHost getReactNativeHost() {
    return reactNativeHost;
  }

  @Override
  public ReactHost getReactHost() {
    return ReactNativeHostWrapper.createReactHost(getApplicationContext(), reactNativeHost);
  }

  @Override
  public void onCreate() {
    super.onCreate();
    ReactNativeApplicationEntryPoint.loadReactNative(this);
    ApplicationLifecycleDispatcher.onApplicationCreate(this);
  }

  @Override
  public void onConfigurationChanged(Configuration newConfig) {
    super.onConfigurationChanged(newConfig);
    ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig);
  }
}