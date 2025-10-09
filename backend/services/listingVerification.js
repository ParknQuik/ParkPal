const prisma = require('../config/prisma');

/**
 * Listing Verification Service
 * Implements automated checks for marketplace listings
 */

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
	const R = 6371; // Earth's radius in km
	const dLat = (lat2 - lat1) * Math.PI / 180;
	const dLon = (lon2 - lon1) * Math.PI / 180;
	const a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
		Math.sin(dLon / 2) * Math.sin(dLon / 2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return R * c;
}

/**
 * Verification Checks
 */

// 1. Photo Verification
async function checkPhotos(photos) {
	const issues = [];
	const MIN_PHOTOS = 2;

	if (!photos || photos.length < MIN_PHOTOS) {
		issues.push({
			severity: 'high',
			type: 'missing_photos',
			message: `Minimum ${MIN_PHOTOS} photos required. Current: ${photos?.length || 0}`,
		});
	}

	return issues;
}

// 2. Price Reasonability Check
async function checkPrice(price, lat, lon) {
	const issues = [];
	const MIN_PRICE = 10;
	const MAX_PRICE = 500;

	if (price < MIN_PRICE) {
		issues.push({
			severity: 'medium',
			type: 'price_too_low',
			message: `Price ₱${price} is unusually low. Minimum recommended: ₱${MIN_PRICE}`,
		});
	}

	if (price > MAX_PRICE) {
		issues.push({
			severity: 'medium',
			type: 'price_too_high',
			message: `Price ₱${price} is unusually high. Maximum recommended: ₱${MAX_PRICE}`,
		});
	}

	// Compare with nearby listings
	const nearbySlots = await prisma.parkingSlot.findMany({
		where: {
			isActive: true,
			status: 'available',
		},
		select: {
			id: true,
			price: true,
			lat: true,
			lon: true,
		},
	});

	const nearby = nearbySlots.filter((slot) => {
		const distance = calculateDistance(lat, lon, slot.lat, slot.lon);
		return distance < 2; // Within 2km
	});

	if (nearby.length > 0) {
		const avgPrice = nearby.reduce((sum, slot) => sum + slot.price, 0) / nearby.length;
		const deviation = Math.abs(price - avgPrice) / avgPrice;

		if (deviation > 0.5) {
			// More than 50% deviation
			issues.push({
				severity: 'low',
				type: 'price_deviation',
				message: `Price deviates ${(deviation * 100).toFixed(0)}% from nearby average (₱${avgPrice.toFixed(0)})`,
			});
		}
	}

	return issues;
}

// 3. Duplicate Location Check
async function checkDuplicateLocation(lat, lon, ownerId, excludeSlotId = null) {
	const issues = [];
	const DUPLICATE_RADIUS = 0.05; // 50 meters

	const allSlots = await prisma.parkingSlot.findMany({
		where: {
			id: excludeSlotId ? { not: excludeSlotId } : undefined,
		},
		select: {
			id: true,
			lat: true,
			lon: true,
			address: true,
			ownerId: true,
		},
	});

	const duplicates = allSlots.filter((slot) => {
		const distance = calculateDistance(lat, lon, slot.lat, slot.lon);
		return distance < DUPLICATE_RADIUS;
	});

	if (duplicates.length > 0) {
		const sameOwner = duplicates.filter((s) => s.ownerId === ownerId);
		const otherOwner = duplicates.filter((s) => s.ownerId !== ownerId);

		if (sameOwner.length > 0) {
			issues.push({
				severity: 'high',
				type: 'duplicate_location_same_owner',
				message: `You already have ${sameOwner.length} listing(s) at this location`,
				details: sameOwner,
			});
		}

		if (otherOwner.length > 0) {
			issues.push({
				severity: 'high',
				type: 'duplicate_location_other_owner',
				message: `${otherOwner.length} other listing(s) exist at this location`,
				details: otherOwner.map((s) => ({ id: s.id, address: s.address })),
			});
		}
	}

	return issues;
}

// 4. Rapid Listing Detection (Spam Prevention)
async function checkRapidListings(ownerId) {
	const issues = [];
	const TIME_WINDOW = 60; // 60 minutes
	const MAX_LISTINGS = 5;

	const recentListings = await prisma.parkingSlot.findMany({
		where: {
			ownerId,
			createdAt: {
				gte: new Date(Date.now() - TIME_WINDOW * 60 * 1000),
			},
		},
		select: {
			id: true,
			createdAt: true,
			address: true,
		},
	});

	if (recentListings.length >= MAX_LISTINGS) {
		issues.push({
			severity: 'high',
			type: 'rapid_listing',
			message: `${recentListings.length} listings created in last ${TIME_WINDOW} minutes. Please slow down.`,
		});
	}

	return issues;
}

// 5. Content Quality Check
async function checkContentQuality(description, address) {
	const issues = [];
	const MIN_DESCRIPTION_LENGTH = 20;

	if (description && description.length < MIN_DESCRIPTION_LENGTH) {
		issues.push({
			severity: 'low',
			type: 'short_description',
			message: `Description is too short (${description.length} chars). Minimum recommended: ${MIN_DESCRIPTION_LENGTH}`,
		});
	}

	if (!description || description.trim().length === 0) {
		issues.push({
			severity: 'medium',
			type: 'missing_description',
			message: 'No description provided. Adding a description improves booking chances.',
		});
	}

	// Check for spam/suspicious content
	const spamKeywords = ['guaranteed', 'free money', 'click here', 'limited time', 'act now'];
	const hasSpam = spamKeywords.some((keyword) =>
		description?.toLowerCase().includes(keyword)
	);

	if (hasSpam) {
		issues.push({
			severity: 'high',
			type: 'suspicious_content',
			message: 'Description contains suspicious keywords',
		});
	}

	return issues;
}

// 6. Location Validation
async function checkLocationValidity(lat, lon, address) {
	const issues = [];

	// Check if coordinates are valid
	if (lat < -90 || lat > 90) {
		issues.push({
			severity: 'high',
			type: 'invalid_latitude',
			message: `Invalid latitude: ${lat}`,
		});
	}

	if (lon < -180 || lon > 180) {
		issues.push({
			severity: 'high',
			type: 'invalid_longitude',
			message: `Invalid longitude: ${lon}`,
		});
	}

	// Check if coordinates are in Philippines (rough bounding box)
	const PH_LAT_MIN = 4.5;
	const PH_LAT_MAX = 21.5;
	const PH_LON_MIN = 116;
	const PH_LON_MAX = 127;

	if (lat < PH_LAT_MIN || lat > PH_LAT_MAX || lon < PH_LON_MIN || lon > PH_LON_MAX) {
		issues.push({
			severity: 'medium',
			type: 'location_outside_philippines',
			message: 'Location appears to be outside the Philippines',
		});
	}

	// Check if address is provided
	if (!address || address.trim().length < 10) {
		issues.push({
			severity: 'high',
			type: 'invalid_address',
			message: 'Address is too short or missing',
		});
	}

	return issues;
}

// 7. Host Reputation Check
async function checkHostReputation(ownerId) {
	const issues = [];

	const host = await prisma.user.findUnique({
		where: { id: ownerId },
		include: {
			ownedSlots: {
				select: {
					id: true,
					rating: true,
					status: true,
				},
			},
		},
	});

	if (!host) {
		issues.push({
			severity: 'high',
			type: 'invalid_host',
			message: 'Host account not found',
		});
		return issues;
	}

	// Check if host is active
	if (!host.isActive) {
		issues.push({
			severity: 'high',
			type: 'inactive_host',
			message: 'Host account is inactive',
		});
	}

	// Check host's existing listings
	const activeListings = host.ownedSlots.filter((s) => s.status !== 'inactive');
	const avgRating =
		activeListings.length > 0
			? activeListings.reduce((sum, s) => sum + s.rating, 0) / activeListings.length
			: 0;

	if (activeListings.length > 0 && avgRating < 2.5) {
		issues.push({
			severity: 'medium',
			type: 'low_host_rating',
			message: `Host has low average rating: ${avgRating.toFixed(1)}/5`,
		});
	}

	return issues;
}

/**
 * Main Verification Function
 * Runs all checks and returns comprehensive report
 */
async function verifyListing(listingData, ownerId, excludeSlotId = null) {
	const { lat, lon, price, address, description, photos, slotType } = listingData;

	const allIssues = [];

	// Run all verification checks
	const checks = await Promise.all([
		checkPhotos(photos),
		checkPrice(price, lat, lon),
		checkDuplicateLocation(lat, lon, ownerId, excludeSlotId),
		checkRapidListings(ownerId),
		checkContentQuality(description, address),
		checkLocationValidity(lat, lon, address),
		checkHostReputation(ownerId),
	]);

	// Flatten all issues
	checks.forEach((checkIssues) => allIssues.push(...checkIssues));

	// Calculate verification score (0-100)
	const highIssues = allIssues.filter((i) => i.severity === 'high').length;
	const mediumIssues = allIssues.filter((i) => i.severity === 'medium').length;
	const lowIssues = allIssues.filter((i) => i.severity === 'low').length;

	const score = Math.max(
		0,
		100 - highIssues * 25 - mediumIssues * 10 - lowIssues * 5
	);

	// Determine if listing should be auto-approved
	const shouldAutoApprove = highIssues === 0 && score >= 70;
	const requiresManualReview = highIssues > 0 || score < 50;

	return {
		score,
		passed: score >= 50,
		shouldAutoApprove,
		requiresManualReview,
		issues: allIssues,
		summary: {
			total: allIssues.length,
			high: highIssues,
			medium: mediumIssues,
			low: lowIssues,
		},
		recommendation: shouldAutoApprove
			? 'auto_approve'
			: requiresManualReview
			? 'manual_review_required'
			: 'pending_approval',
	};
}

module.exports = {
	verifyListing,
	checkPhotos,
	checkPrice,
	checkDuplicateLocation,
	checkRapidListings,
	checkContentQuality,
	checkLocationValidity,
	checkHostReputation,
};
