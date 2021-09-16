import AHRS from 'ahrs'
import { Accelerometer, Magnetometer, Gyroscope, ThreeAxisMeasurement } from 'expo-sensors'

export type Subscription = {
  /**
   * A method to unsubscribe the listener.
   */
  remove: () => void
}
export type Listener<E> = (event: E) => void
export type EulerAngles = {
  yaw: number
  pitch: number
  roll: number
}
export default class Orientation {
  private static sampleInterval = 20
  private static _listenerCount = 0

  private static accelerometerMeasurement: ThreeAxisMeasurement | null = null
  private static magnetometerMeasurement: ThreeAxisMeasurement | null = null
  private static gyroscopeMeasurement: ThreeAxisMeasurement | null = null

  private static ahrs = new AHRS({
    sampleInterval: Orientation.sampleInterval,
  })

  private static updateAHRS() {
    if (
      !Orientation.accelerometerMeasurement ||
      !Orientation.magnetometerMeasurement ||
      !Orientation.gyroscopeMeasurement
    )
      return
    Orientation.ahrs.update(
      Orientation.gyroscopeMeasurement.x,
      Orientation.gyroscopeMeasurement.y,
      Orientation.gyroscopeMeasurement.z,
      Orientation.accelerometerMeasurement.x,
      Orientation.accelerometerMeasurement.y,
      Orientation.accelerometerMeasurement.z,
      Orientation.magnetometerMeasurement.x,
      Orientation.magnetometerMeasurement.y,
      Orientation.magnetometerMeasurement.z,
    )
  }

  static getEulerAngles = (): EulerAngles => {
    const AHRSEulerAngles = Orientation.ahrs.getEulerAngles()
    return {
      // correct angles axis (pitch and roll swapped, yaw reversed)
      pitch: AHRSEulerAngles.roll,
      roll: AHRSEulerAngles.pitch,
      yaw: -AHRSEulerAngles.heading,
    }
  }

  static setUpdateInterval(intervalMs: number) {
    if (intervalMs !== Orientation.sampleInterval) {
      Orientation.sampleInterval = intervalMs
      Orientation.ahrs = new AHRS({
        sampleInterval: Orientation.sampleInterval,
      })
    }
    Accelerometer.setUpdateInterval(intervalMs)
    Magnetometer.setUpdateInterval(intervalMs)
    Gyroscope.setUpdateInterval(intervalMs)
  }

  static async isAvailableAsync() {
    return (
      (await Accelerometer.isAvailableAsync()) &&
      (await Magnetometer.isAvailableAsync()) &&
      (await Gyroscope.isAvailableAsync())
    )
  }

  static addListener = (listener: Listener<EulerAngles>): Subscription => {
    Orientation.setUpdateInterval(Orientation.sampleInterval)
    Orientation._listenerCount++
    const accelerometerSubscriber = Accelerometer.addListener(measurement => {
      Orientation.accelerometerMeasurement = measurement
    })
    const magnetometerSubscriber = Magnetometer.addListener(measurement => {
      Orientation.magnetometerMeasurement = measurement
    })
    const gyroscopeSubscriber = Gyroscope.addListener(measurement => {
      Orientation.gyroscopeMeasurement = measurement
      Orientation.updateAHRS()
      listener(Orientation.getEulerAngles())
    })

    return {
      remove() {
        accelerometerSubscriber.remove()
        magnetometerSubscriber.remove()
        gyroscopeSubscriber.remove()
        Orientation._listenerCount--
      },
    }
  }

  static get hasListener() {
    return Orientation._listenerCount > 0
  }

  static get listenerCount() {
    return Orientation._listenerCount
  }
}
