import { Shippo } from "shippo";
import { PACKAGE_SIZES, type PackageSize } from "@shared/schema";

const SHIPPO_API_KEY = process.env.SHIPPO_API_KEY;

if (!SHIPPO_API_KEY) {
  console.warn("Warning: SHIPPO_API_KEY not set. Shipping features will be disabled.");
}

const shippo = SHIPPO_API_KEY ? new Shippo({ apiKeyHeader: SHIPPO_API_KEY }) : null;

const FROM_ADDRESS = {
  name: "Archive Commodities",
  street1: "123 Archive Street",
  city: "Los Angeles",
  state: "CA",
  zip: "90001",
  country: "US",
  phone: "+1 555 341 9393",
  email: "shipping@archive-commodities.com",
};

export interface ShippingAddress {
  name: string;
  street1: string;
  street2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  email?: string;
  phone?: string;
}

export interface ShippingRate {
  rateId: string;
  carrier: string;
  service: string;
  estimatedDays: number;
  amount: number;
  currency: string;
}

export interface ShippingLabel {
  labelUrl: string;
  trackingNumber: string;
  trackingUrl: string;
}

export async function getShippingRates(
  toAddress: ShippingAddress,
  packageSize: PackageSize
): Promise<ShippingRate[]> {
  if (!shippo) {
    return getMockRates(packageSize);
  }

  try {
    const pkg = PACKAGE_SIZES[packageSize];
    
    const shipment = await shippo.shipments.create({
      addressFrom: FROM_ADDRESS,
      addressTo: toAddress,
      parcels: [{
        length: String(pkg.length),
        width: String(pkg.width),
        height: String(pkg.height),
        distanceUnit: "in",
        weight: String(pkg.maxWeight),
        massUnit: "lb",
      }],
    });

    const rates = shipment.rates || [];
    
    return rates
      .filter((rate: any) => rate.amount && rate.provider && rate.servicelevel?.name)
      .map((rate: any) => ({
        rateId: rate.objectId || "",
        carrier: rate.provider || "",
        service: rate.servicelevel?.name || "",
        estimatedDays: rate.estimatedDays || 5,
        amount: Math.round(parseFloat(rate.amount || "0") * 100),
        currency: rate.currency || "USD",
      }))
      .sort((a: ShippingRate, b: ShippingRate) => a.amount - b.amount)
      .slice(0, 5);
  } catch (error) {
    console.error("Error fetching shipping rates:", error);
    return getMockRates(packageSize);
  }
}

export async function purchaseShippingLabel(
  rateId: string
): Promise<ShippingLabel> {
  if (!shippo) {
    return getMockLabel();
  }

  try {
    const transaction = await shippo.transactions.create({
      rate: rateId,
      labelFileType: "PDF",
      async: false,
    });

    if (transaction.status !== "SUCCESS") {
      throw new Error(transaction.messages?.join(", ") || "Failed to purchase label");
    }

    return {
      labelUrl: transaction.labelUrl || "",
      trackingNumber: transaction.trackingNumber || "",
      trackingUrl: transaction.trackingUrlProvider || "",
    };
  } catch (error) {
    console.error("Error purchasing shipping label:", error);
    throw error;
  }
}

export async function createShipmentAndPurchaseLabel(
  toAddress: ShippingAddress,
  packageSize: PackageSize,
  preferredCarrier: string = "usps"
): Promise<ShippingLabel> {
  const rates = await getShippingRates(toAddress, packageSize);
  
  const selectedRate = rates.find(
    (r) => r.carrier.toLowerCase() === preferredCarrier.toLowerCase()
  ) || rates[0];

  if (!selectedRate) {
    throw new Error("No shipping rates available");
  }

  return purchaseShippingLabel(selectedRate.rateId);
}

function getMockRates(packageSize: PackageSize): ShippingRate[] {
  const basePrices = { small: 599, medium: 899, large: 1299 };
  const base = basePrices[packageSize];
  
  return [
    {
      rateId: "mock_usps_ground",
      carrier: "USPS",
      service: "Ground Advantage",
      estimatedDays: 5,
      amount: base,
      currency: "USD",
    },
    {
      rateId: "mock_usps_priority",
      carrier: "USPS",
      service: "Priority Mail",
      estimatedDays: 3,
      amount: base + 300,
      currency: "USD",
    },
    {
      rateId: "mock_ups_ground",
      carrier: "UPS",
      service: "Ground",
      estimatedDays: 5,
      amount: base + 100,
      currency: "USD",
    },
  ];
}

function getMockLabel(): ShippingLabel {
  const trackingNumber = `MOCK${Date.now()}`;
  return {
    labelUrl: `https://example.com/labels/${trackingNumber}.pdf`,
    trackingNumber,
    trackingUrl: `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`,
  };
}

export function getEstimatedShippingCost(packageSize: PackageSize): number {
  const basePrices = { small: 599, medium: 899, large: 1299 };
  return basePrices[packageSize];
}

export function isShippoConfigured(): boolean {
  return !!shippo;
}
