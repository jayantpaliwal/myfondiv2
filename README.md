# myfondi-app



###### Install Node
https://nodejs.org/en/download/
After installation go to command prompt and run below command to check the version
```ssh
$ node -v
```
###### install ionic and cordova using below commands
```ssh
$ npm install -g ionic cordova@latest
```
above command will install both ionic and cordova globally
###### Install java sdk 1.8.0_171 
http://www.oracle.com/technetwork/java/javase/downloads/jdk8-downloads-2133151.html?printOnly=1 

After Installation completes, set enviroment variables for both android and jdk
###### For windows

* Go to Mycomputer properties -> Advances System Settings
* Click on Environment Variables
* In User Variables click New to add ANDROID_HOME and JAVA_HOME
* In System Variables, add same values of Android_HOMe and JAVA_HOME
* In System Vriables, select path and edit to add ```%ANDROID_HOME&\tools , %ANDROID_HOME&\platform-tools, %JAVA_HOME%\bin```
* After setting variables restart your system once.

###### For MacOS / Ubuntu
* find path of Android sdk and Java
* open terminal
* open .bash_profile by typing ``` vim ~/.bash_profile```
* add following lines at the end of it
    * ```export JAVA_HOME=<path of java>```
    * ```export ANDROID_HOME=<path of android sdk>```


##### Install dependencies
```ssh
$ npm install
```

##### verify installations
```ssh
$ ionic info
```
you will see following output
```
Cordova:
  Cordova CLI       : not installed
  Cordova Platforms : android 8.0.0
  Cordova Plugins   : cordova-plugin-ionic-keyboard 2.1.3, cordova-plugin-ionic
webview 4.1.1, (and 8 other plugins)

Utility:

  cordova-res : 0.6.0
  native-run  : not installed


  Android SDK Tools : 26.1.1 (C:\Users\Desk\AppData\Local\Android\sdk)
  NodeJS            : v8.10.0 (C:\Program Files\nodejs\node.exe)
  npm               : 6.4.0
  OS                : Windows 8.1
  
  
Environment Variables:
    ANDROID_HOME : C:\Users\admin\AppData\Local\Android\Sdk
Misc:
    backend : pro
```

#### Run the app in browser

Run below command to run the code in browser, it will setup local server and run the app in browser
```ssh
ionic serve
```

### Create Android builds (Locally)
```ssh
$ ionic cordova platform add android
$ ionic cordova build android
```
Above commands will successfully create an ```.apk``` file at ```./platforms/android/build/outputs/apk/debug```

##### Run Android build on Device
If you have andriod device then you can place above ```.apk``` in your device and tap it to run it. Or you can run following command to directly run build on your device. Make sure your device is connected via USB cabel.

```ssh
ionic cordova run android
```

##### Run Android build in Emulator
To test the app in emulators, first setup android devices in android studio
Open Android Studio, at bottom of start up window go to SDK Manager in configure
-- select one sdk platform and click apply to install
next, in start up window select  Start a new Android Studio Project.It will create empty application
-- Go to Tools -> Android -> Android Device Manager
-- Create virutal Device
Afetr setup done it will come in the list, in Actions, click on lauch emulator 
In command prompt run the below command to run the app in emulator
```ssh
$ ionic cordova emulate android
```

* Settings
Create config.ts file 
## location- src/config/config.ts

```ssh
 var firebase_config = {
  apiKey: "******************",
  authDomain: "******************",
  databaseURL: "******************",
  projectId: "******************",
  storageBucket: "******************",
  messagingSenderId:  "******************",
  appId:  "******************",
 };
 var cloud_api="Your Cloud API domain";
 var api_token="AIzaSyCWpWQqNku-9_d6gxFh-zGdQ-YoQjOmxA0";
 export { firebase_config,cloud_api,api_token }
```
##### don't change api_token, the value is used for api security