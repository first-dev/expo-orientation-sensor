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

  private static accelerometerSubscriber: Subscription | null = null
  private static magnetometerSubscriber: Subscription | null = null
  private static gyroscopeSubscriber: Subscription | null = null

  private static accelerometerMeasurement: ThreeAxisMeasurement | null = null
  private static magnetometerMeasurement: ThreeAxisMeasurement | null = null
  private static gyroscopeMeasurement: ThreeAxisMeasurement | null = null

  private static listeners: Listener<EulerAngles>[] = []

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

  private static unsubscribeExpoListeners() {
    Orientation.accelerometerSubscriber?.remove()
    Orientation.accelerometerSubscriber = null
    Orientation.magnetometerSubscriber?.remove()
    Orientation.magnetometerSubscriber = null
    Orientation.gyroscopeSubscriber?.remove()
    Orientation.gyroscopeSubscriber = null
  }

  static get eulerAngles(): EulerAngles {
    const AHRSEulerAngles = Orientation.ahrs.getEulerAngles()
    return {
      // correct angles axis (pitch and roll swapped, yaw reversed)
      pitch: AHRSEulerAngles.roll,
      roll: AHRSEulerAngles.pitch,
      yaw: -AHRSEulerAngles.heading,
    }
  }

  static setUpdateInterval(intervalMs: number): void {
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

  static async isAvailableAsync(): Promise<boolean> {
    return (
      (await Accelerometer.isAvailableAsync()) &&
      (await Magnetometer.isAvailableAsync()) &&
      (await Gyroscope.isAvailableAsync())
    )
  }

  static addListener = (listener: Listener<EulerAngles>): Subscription => {
    Orientation.listeners.push(listener)
    Accelerometer.setUpdateInterval(Orientation.sampleInterval)
    Magnetometer.setUpdateInterval(Orientation.sampleInterval)
    Gyroscope.setUpdateInterval(Orientation.sampleInterval)
    if (Orientation.accelerometerSubscriber === null) {
      Orientation.accelerometerSubscriber = Accelerometer.addListener(measurement => {
        Orientation.accelerometerMeasurement = measurement
      })
    }
    if (Orientation.magnetometerSubscriber === null) {
      Orientation.magnetometerSubscriber = Magnetometer.addListener(measurement => {
        Orientation.magnetometerMeasurement = measurement
      })
    }
    if (Orientation.gyroscopeSubscriber === null) {
      Orientation.gyroscopeSubscriber = Gyroscope.addListener(measurement => {
        Orientation.gyroscopeMeasurement = measurement
        Orientation.updateAHRS()
        Orientation.listeners.forEach(l => l(Orientation.eulerAngles))
      })
    }

    return {
      remove() {
        Orientation.listeners = Orientation.listeners.filter(l => l !== listener)
        if (Orientation.listeners.length === 0) {
          Orientation.unsubscribeExpoListeners()
        }
      },
    }
  }

  static removeAllListeners(): void {
    Orientation.listeners = []
    Orientation.unsubscribeExpoListeners()
  }

  static get hasListener(): boolean {
    return Orientation.listeners.length > 0
  }

  static get listenerCount(): number {
    return Orientation.listeners.length
  }
}
