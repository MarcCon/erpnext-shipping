// Copyright (c) 2020, Frappe and contributors
// For license information, please see license.txt

frappe.ui.form.on("Shipment", {
	refresh: function (frm) {
		if (frm.doc.docstatus === 1 && !frm.doc.shipment_id) {
			frm.add_custom_button(__("Fetch Shipping Rates"), function () {
				if (frm.doc.shipment_parcel.length > 1) {
					frappe.confirm(
						__(
							"If your shipment contains packages with varying weights, the estimated shipping rates may differ from the final price charged by your carrier. Do you wish to proceed?"
						),
						function () {
							frm.events.fetch_shipping_rates(frm);
						}
					);
				} else {
					frm.events.fetch_shipping_rates(frm);
				}
			});
		}
		if (frm.doc.shipment_id) {
			frm.add_custom_button(
				__("Print Shipping Label"),
				function () {
					return frm.events.print_shipping_label(frm);
				},
				__("Tools")
			);

			if (frm.doc.return_shipment_id) {
				frm.add_custom_button(
					__("Print Return Label"),
					function () {
						return frm.events.print_return_label(frm);
					},
					__("Tools")
				);
			}

			if (!frm.doc.return_shipment_id) {
				frm.add_custom_button(
					__("Create Return Label"),
					function () {
						frm.events.fetch_return_shipping_rates(frm);
					},
					__("Tools")
				);
			}

			if (frm.doc.tracking_status != "Delivered") {
				frm.add_custom_button(
					__("Update Tracking"),
					function () {
						return frm.events.update_tracking(
							frm,
							frm.doc.service_provider,
							frm.doc.shipment_id
						);
					},
					__("Tools")
				);

				if (frm.doc.return_shipment_id) {
					frm.add_custom_button(
						__("Track Parcel Status"),
						function () {
							if (frm.doc.tracking_url) {
								const urls = frm.doc.tracking_url.split(", ");
								urls.forEach((url) => window.open(url));
							} else {
								let msg = __(
									"Please complete Shipment (ID: {0}) on {1} and Update Tracking.",
									[frm.doc.shipment_id, frm.doc.service_provider]
								);
								frappe.msgprint({
									message: msg,
									title: __("Incomplete Shipment"),
								});
							}
						},
						__("View")
					);
					frm.add_custom_button(
						__("Track Return Status"),
						function () {
							if (frm.doc.return_tracking_url) {
								const urls = frm.doc.return_tracking_url.split(", ");
								urls.forEach((url) => window.open(url));
							} else {
								frappe.msgprint({
									message: __("Return tracking data not available."),
									title: __("No Return Tracking"),
								});
							}
						},
						__("View")
					);
				} else {
					frm.add_custom_button(
						__("Track Status"),
						function () {
							if (frm.doc.tracking_url) {
								const urls = frm.doc.tracking_url.split(", ");
								urls.forEach((url) => window.open(url));
							} else {
								let msg = __(
									"Please complete Shipment (ID: {0}) on {1} and Update Tracking.",
									[frm.doc.shipment_id, frm.doc.service_provider]
								);
								frappe.msgprint({
									message: msg,
									title: __("Incomplete Shipment"),
								});
							}
						},
						__("View")
					);
				}
			}
		}
	},

	print_return_label: function (frm) {
		frappe.call({
			method: "erpnext_shipping.erpnext_shipping.shipping.print_return_label",
			freeze: true,
			freeze_message: __("Printing Return Label"),
			args: { shipment: frm.doc.name },
			callback: function (r) {
				if (r.message) {
					if (Array.isArray(r.message)) {
						r.message.forEach((url) => window.open(url));
					} else {
						window.open(r.message);
					}
				}
			},
		});
	},

	fetch_shipping_rates: function (frm) {
		if (!frm.doc.shipment_id) {
			frappe.call({
				method: "erpnext_shipping.erpnext_shipping.shipping.fetch_shipping_rates",
				freeze: true,
				freeze_message: __("Fetching Shipping Rates"),
				args: {
					pickup_from_type: frm.doc.pickup_from_type,
					delivery_to_type: frm.doc.delivery_to_type,
					pickup_address_name: frm.doc.pickup_address_name,
					delivery_address_name: frm.doc.delivery_address_name,
					parcels: frm.doc.shipment_parcel,
					description_of_content: frm.doc.description_of_content,
					pickup_date: frm.doc.pickup_date,
					pickup_contact_name:
						frm.doc.pickup_from_type === "Company"
							? frm.doc.pickup_contact_person
							: frm.doc.pickup_contact_name,
					delivery_contact_name: frm.doc.delivery_contact_name,
					value_of_goods: frm.doc.value_of_goods,
				},
				callback: function (r) {
					if (r.message && r.message.length) {
						select_from_available_services(frm, r.message);
					} else {
						frappe.msgprint({
							message: __("No Shipment Services available"),
							title: __("Note"),
						});
					}
				},
			});
		} else {
			frappe.throw(__("Shipment already created"));
		}
	},

	fetch_return_shipping_rates: function (frm) {
		frappe.call({
			method: "erpnext_shipping.erpnext_shipping.shipping.fetch_return_shipping_rates",
			freeze: true,
			freeze_message: __("Fetching Return Shipping Rates"),
			args: {
				pickup_from_type: frm.doc.pickup_from_type,
				delivery_to_type: frm.doc.delivery_to_type,
				pickup_address_name: frm.doc.pickup_address_name,
				delivery_address_name: frm.doc.delivery_address_name,
				parcels: frm.doc.shipment_parcel,
			},
			callback: function (r) {
				if (r.message && r.message.length) {
					select_from_available_return_services(frm, r.message);
				} else {
					frappe.msgprint({
						message: __("No Return Shipping Services available"),
						title: __("Note"),
					});
				}
			},
		});
	},

	print_shipping_label: function (frm) {
		frappe.call({
			method: "erpnext_shipping.erpnext_shipping.shipping.print_shipping_label",
			freeze: true,
			freeze_message: __("Printing Shipping Label"),
			args: {
				shipment: frm.doc.name,
			},
			callback: function (r) {
				if (r.message) {
					if (frm.doc.service_provider == "LetMeShip") {
						var array = JSON.parse(r.message);
						// Uint8Array for unsigned bytes
						array = new Uint8Array(array);
						const file = new Blob([array], { type: "application/pdf" });
						const file_url = URL.createObjectURL(file);
						window.open(file_url);
					} else {
						if (Array.isArray(r.message)) {
							r.message.forEach((url) => window.open(url));
						} else {
							window.open(r.message);
						}
					}
				}
			},
		});
	},

	update_tracking: function (frm, service_provider, shipment_id) {
		const delivery_notes = frm.doc.shipment_delivery_note.map((d) => d.delivery_note);

		frappe.call({
			method: "erpnext_shipping.erpnext_shipping.shipping.update_tracking",
			freeze: true,
			freeze_message: __("Updating Tracking"),
			args: {
				shipment: frm.doc.name,
				shipment_id: shipment_id,
				service_provider: service_provider,
				delivery_notes: delivery_notes,
			},
			callback: function (r) {
				if (frm.doc.return_shipment_id) {
					frappe.call({
						method: "erpnext_shipping.erpnext_shipping.shipping.update_return_tracking",
						freeze: true,
						freeze_message: __("Updating Return Tracking"),
						args: {
							shipment: frm.doc.name,
							return_shipment_id: frm.doc.return_shipment_id,
							service_provider: service_provider,
						},
						callback: function (r2) {
							if (!r2.exc) {
								frm.reload_doc();
							}
						},
					});
				} else {
					if (!r.exc) {
						frm.reload_doc();
					}
				}
			},
		});
	},
});

function select_from_available_services(frm, available_services) {
	const arranged_services = available_services.reduce(
		(prev, curr) => {
			if (curr.is_preferred) {
				prev.preferred_services.push(curr);
			} else {
				prev.other_services.push(curr);
			}
			return prev;
		},
		{ preferred_services: [], other_services: [] }
	);

	const dialog = new frappe.ui.Dialog({
		title: __("Select Service to Create Shipment"),
		size: "extra-large",
		fields: [
			{
				fieldtype: "HTML",
				fieldname: "available_services",
				label: __("Available Services"),
			},
		],
	});

	const delivery_notes = frm.doc.shipment_delivery_note.map((d) => d.delivery_note);

	dialog.fields_dict.available_services.$wrapper.html(
		frappe.render_template("shipment_service_selector", {
			header_columns: [__("Platform"), __("Carrier"), __("Parcel Service"), __("Price"), ""],
			data: arranged_services,
		})
	);

	dialog.$body.on("click", ".btn", function () {
		let service_type = $(this).attr("data-type");
		let service_index = cint($(this).attr("id").split("-")[2]);
		let service_data = arranged_services[service_type][service_index];
		frm.select_row(service_data);
	});

	frm.select_row = function (service_data) {
		frappe.call({
			method: "erpnext_shipping.erpnext_shipping.shipping.create_shipment",
			freeze: true,
			freeze_message: __("Creating Shipment"),
			args: {
				shipment: frm.doc.name,
				pickup_from_type: frm.doc.pickup_from_type,
				delivery_to_type: frm.doc.delivery_to_type,
				pickup_address_name: frm.doc.pickup_address_name,
				delivery_address_name: frm.doc.delivery_address_name,
				shipment_parcel: frm.doc.shipment_parcel,
				description_of_content: frm.doc.description_of_content,
				pickup_date: frm.doc.pickup_date,
				pickup_contact_name:
					frm.doc.pickup_from_type === "Company"
						? frm.doc.pickup_contact_person
						: frm.doc.pickup_contact_name,
				delivery_contact_name: frm.doc.delivery_contact_name,
				value_of_goods: frm.doc.value_of_goods,
				service_data: service_data,
				delivery_notes: delivery_notes,
			},
			callback: function (r) {
				if (!r.exc) {
					frm.reload_doc();
					frappe.msgprint({
						message: __("Shipment {1} has been created with {0}.", [
							r.message.service_provider,
							r.message.shipment_id.bold(),
						]),
						title: __("Shipment Created"),
						indicator: "green",
					});
					frm.events.update_tracking(
						frm,
						r.message.service_provider,
						r.message.shipment_id
					);
				}
			},
		});
		dialog.hide();
	};
	dialog.show();
}

function select_from_available_return_services(frm, available_services) {
	const arranged_services = available_services.reduce(
		(prev, curr) => {
			if (curr.is_preferred) {
				prev.preferred_services.push(curr);
			} else {
				prev.other_services.push(curr);
			}
			return prev;
		},
		{ preferred_services: [], other_services: [] }
	);

	const dialog = new frappe.ui.Dialog({
		title: __("Select Service to Create Return Shipment"),
		size: "extra-large",
		fields: [
			{
				fieldtype: "HTML",
				fieldname: "available_services",
				label: __("Available Return Services"),
			},
		],
	});

	dialog.fields_dict.available_services.$wrapper.html(
		frappe.render_template("shipment_service_selector", {
			header_columns: [__("Platform"), __("Carrier"), __("Parcel Service"), __("Price"), ""],
			data: arranged_services,
		})
	);

	dialog.$body.on("click", ".btn", function () {
		const serviceType = $(this).attr("data-type");
		const serviceIndex = cint($(this).attr("id").split("-")[2]);
		const serviceData = arranged_services[serviceType][serviceIndex];
		frm.select_return_row(serviceData);
	});

	frm.select_return_row = function (serviceData) {
		frappe.call({
			method: "erpnext_shipping.erpnext_shipping.shipping.create_return_shipment",
			freeze: true,
			freeze_message: __("Creating Return Shipment"),
			args: {
				shipment: frm.doc.name,
				pickup_from_type: frm.doc.pickup_from_type,
				delivery_to_type: frm.doc.delivery_to_type,
				pickup_address_name: frm.doc.pickup_address_name,
				delivery_address_name: frm.doc.delivery_address_name,
				shipment_parcel: frm.doc.shipment_parcel,
				pickup_contact_name:
					frm.doc.pickup_from_type === "Company"
						? frm.doc.pickup_contact_person
						: frm.doc.pickup_contact_name,
				delivery_contact_name: frm.doc.delivery_contact_name,
				service_data: serviceData,
			},
			callback: function (r) {
				if (!r.exc) {
					frm.reload_doc();
					frappe.msgprint({
						message: __("Return Shipment {0} has been created.", [
							r.message.return_id.bold(),
						]),
						title: __("Return Shipment Created"),
						indicator: "green",
					});
					frm.events.update_return_tracking(
						frm,
						r.message.service_provider,
						r.message.return_id
					);
				}
			},
		});
		dialog.hide();
	};

	dialog.show();
}
