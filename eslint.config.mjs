/*
 * Author    : Francesco
 * Created at: 2024-02-03 11:29
 * Edited by : Francesco
 * Edited at : 2025-12-09 20:56
 *
 * Copyright (c) 2024 Xevolab S.R.L.
 */

import ts from "@xevolab/eslint-config/ts";

export default [
	...ts,
	{
		rules: {
			"no-underscore-dangle": "off",
		}
	}
];
