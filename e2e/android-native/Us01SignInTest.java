package com.charifmahmoudi.invite.evidence;

import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

import android.content.Context;
import android.content.Intent;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import androidx.test.uiautomator.By;
import androidx.test.uiautomator.UiDevice;
import androidx.test.uiautomator.UiObject2;
import androidx.test.uiautomator.Until;
import java.io.File;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;

/**
 * Native Android acceptance evidence for US-01.
 *
 * <p>The screenshot is written only after the signed-in activity discovery screen is visible.
 */
@RunWith(AndroidJUnit4.class)
public final class Us01SignInTest {
  private static final String APP_ID = "com.charifmahmoudi.invite";
  private static final long SCREEN_TIMEOUT_MS = 60_000L;
  private UiDevice device;
  private Context targetContext;

  @Before
  public void launchCleanApplication() throws Exception {
    device = UiDevice.getInstance(InstrumentationRegistry.getInstrumentation());
    targetContext = InstrumentationRegistry.getInstrumentation().getTargetContext();

    device.executeShellCommand("pm clear " + APP_ID);
    Intent launchIntent = targetContext.getPackageManager().getLaunchIntentForPackage(APP_ID);
    assertNotNull("Invite launch intent must exist", launchIntent);
    launchIntent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TASK | Intent.FLAG_ACTIVITY_NEW_TASK);
    targetContext.startActivity(launchIntent);

    assertTrue(
        "Welcome screen did not become visible",
        device.wait(Until.hasObject(By.res(APP_ID, "welcome-screen")), SCREEN_TIMEOUT_MS));
  }

  @Test
  public void returningMemberCanSignInAndCaptureEvidence() throws Exception {
    UiObject2 signIn = findWithDownwardScroll("welcome-sign-in");
    assertNotNull("Sign-in action must be reachable", signIn);
    signIn.click();

    assertTrue(
        "Sign-in screen did not become visible",
        device.wait(Until.hasObject(By.res(APP_ID, "auth-sign-in-screen")), SCREEN_TIMEOUT_MS));

    replaceText("auth-email", "demo@invite.app");
    replaceText("auth-password", "invite-demo");
    device.pressBack();

    UiObject2 submit = device.wait(Until.findObject(By.res(APP_ID, "auth-submit")), SCREEN_TIMEOUT_MS);
    assertNotNull("Sign-in submit button must exist", submit);
    submit.click();

    assertTrue(
        "Authenticated activity discovery screen did not become visible",
        device.wait(Until.hasObject(By.text("What sounds good?")), SCREEN_TIMEOUT_MS));

    File evidenceDirectory = new File(targetContext.getExternalFilesDir(null), "evidence/US-01");
    assertTrue(
        "Evidence directory could not be created",
        evidenceDirectory.exists() || evidenceDirectory.mkdirs());
    File screenshot = new File(evidenceDirectory, "01-returning-member-signed-in.png");
    assertTrue("Assertion-backed screenshot could not be saved", device.takeScreenshot(screenshot));
    assertTrue("Evidence screenshot is empty", screenshot.length() > 0);
  }

  private void replaceText(String resourceId, String value) {
    UiObject2 field = device.wait(Until.findObject(By.res(APP_ID, resourceId)), SCREEN_TIMEOUT_MS);
    assertNotNull(resourceId + " must exist", field);
    field.click();
    field.clear();
    field.setText(value);
  }

  private UiObject2 findWithDownwardScroll(String resourceId) {
    for (int attempt = 0; attempt < 5; attempt++) {
      UiObject2 candidate = device.findObject(By.res(APP_ID, resourceId));
      if (candidate != null) {
        return candidate;
      }
      device.swipe(
          device.getDisplayWidth() / 2,
          (device.getDisplayHeight() * 3) / 4,
          device.getDisplayWidth() / 2,
          device.getDisplayHeight() / 4,
          20);
    }
    return null;
  }
}
