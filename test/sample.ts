// Sample TypeScript file with hex color values (like Undercurrent theme file)

const styleOverrides = {
	':root': {
		// Colors - Fallback hex values
		'--color-red-50': '#FEF2F2',
		'--color-red-100': '#FEE2E2',
		'--color-red-500': '#EF4444',
		'--color-blue-50': '#EFF6FF',
		'--color-blue-100': '#DBEAFE',
		'--color-blue-500': '#3B82F6',
		'--color-gray-50': '#FAFAFA',
		'--color-gray-100': '#F5F5F5',
		'--color-gray-900': '#171717',

		/**
		 * OKLCH (https://oklch.com/) Color Primitives
		 * Used for browsers that support the oklch() function.
		 */
		'@supports (color: oklch(0 0 0))': {
			'--color-blue-100': 'oklch(0.932 0.032 255.59)',
			'--color-blue-50': 'oklch(0.97 0.014 254.6)',
			'--color-blue-500': 'oklch(0.623 0.188 259.81)',
			'--color-gray-100': 'oklch(0.97 0 0)',
			'--color-gray-50': 'oklch(0.985 0 0)',
			'--color-gray-900': 'oklch(0.205 0 0)',
			'--color-red-100': 'oklch(0.936 0.031 17.72)',
			'--color-red-50': 'oklch(0.971 0.013 17.38)',
			'--color-red-500': 'oklch(0.637 0.208 25.33)',
		},
	},
	body: {
		margin: 0,
		padding: 0,
	},
};

export default styleOverrides;
